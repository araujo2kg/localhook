import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { createApp } from '../server/app';
import type { Snapshot } from '../shared/types';
import { isRecord, parseSnapshot } from '../shared/validation';

async function receiver(t: TestContext, responseDelayMs = 0) {
    const { app, close } = createApp({ responseDelayMs });
    const server = app.listen(0, '127.0.0.1');

    t.after(async () => {
        close();
        const stopped = new Promise<void>((resolve, reject) =>
            server.close((error) => {
                if (error) {
                    reject(error);

                    return;
                }

                resolve();
            }),
        );

        server.closeAllConnections();
        await stopped;
    });

    if (!server.listening) {
        await once(server, 'listening');
    }

    const address = server.address();

    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    const history = async (): Promise<Snapshot> => {
        const response = await fetch(`${base}/api/requests`);

        return parseSnapshot(await response.json());
    };

    const waitForCaptures = async (count: number) => {
        const deadline = performance.now() + 2000;

        while ((await history()).total < count) {
            assert.ok(
                performance.now() < deadline,
                'Requests should be captured before responding',
            );

            await sleep(10);
        }
    };

    return { base, close, history, waitForCaptures };
}

void test(
    'captures concurrent POST and GET immediately, keeps APIs live, and preserves the delay active at arrival',
    { timeout: 10_000 },
    async (t) => {
        const { base, history, waitForCaptures } = await receiver(t, 1000);
        const started = performance.now();
        let completed = 0;
        const responses = ['POST', 'GET'].map(async (method) => {
            const response = await fetch(`${base}/webhook?method=${method}`, { method });
            const elapsed = performance.now() - started;

            completed++;

            return { response, elapsed };
        });

        await waitForCaptures(2);
        assert.equal(completed, 0);
        assert.deepEqual(
            new Set((await history()).requests.map((request) => request.method)),
            new Set(['POST', 'GET']),
        );

        const update = await fetch(`${base}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: '{"responseDelayMs":0}',
        });

        assert.equal(update.status, 200);
        assert.deepEqual(await update.json(), { responseDelayMs: 0 });
        assert.deepEqual(await (await fetch(`${base}/api/settings`)).json(), {
            responseDelayMs: 0,
        });

        // A new request responds while the original requests are still waiting.
        assert.equal((await fetch(`${base}/webhook`, { method: 'POST' })).status, 200);
        assert.equal(completed, 0);
        // Clearing history must not cancel pending acknowledgments.
        assert.equal((await fetch(`${base}/api/requests`, { method: 'DELETE' })).status, 204);
        for (const { response, elapsed } of await Promise.all(responses)) {
            assert.equal(response.status, 200);
            assert.ok(elapsed >= 1000, `Response arrived after ${elapsed} ms`);
            const acknowledgment: unknown = await response.json();

            assert.ok(isRecord(acknowledgment));
            assert.equal(acknowledgment.ok, true);
        }

        assert.equal((await history()).total, 0);
    },
);

void test(
    'validates settings without changing the active delay and enforces local API access',
    { timeout: 10_000 },
    async (t) => {
        const { base } = await receiver(t, 25);

        for (const value of [-1, 0.5, 3_600_001, '100', null, true]) {
            const response = await fetch(`${base}/api/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responseDelayMs: value }),
            });

            assert.equal(response.status, 400);
        }

        assert.equal(
            (
                await fetch(`${base}/api/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}',
                })
            ).status,
            400,
        );

        assert.equal(
            (
                await fetch(`${base}/api/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{',
                })
            ).status,
            400,
        );

        assert.equal(
            (
                await fetch(`${base}/api/settings`, {
                    method: 'PUT',
                    headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' },
                    body: '{"responseDelayMs":0}',
                })
            ).status,
            403,
        );

        assert.deepEqual(await (await fetch(`${base}/api/settings`)).json(), {
            responseDelayMs: 25,
        });
    },
);

void test(
    'handles client cancellation and closes pending responses on shutdown',
    { timeout: 10_000 },
    async (t) => {
        const { base, close, history, waitForCaptures } = await receiver(t, 60_000);
        const controller = new AbortController();
        const aborted = fetch(`${base}/webhook`, { method: 'POST', signal: controller.signal });
        const cancelled = assert.rejects(aborted, { name: 'AbortError' });

        await waitForCaptures(1);
        controller.abort();
        await cancelled;
        const pending = fetch(`${base}/webhook`);
        const disconnected = assert.rejects(pending, /fetch failed/);

        await waitForCaptures(2);
        assert.equal((await history()).total, 2);
        close();
        await disconnected;
    },
);
