import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { createApp } from '../server/app';
import { DEFAULT_GET_RESPONSE } from '../shared/constants';
import { parseReceiverSettings, parseSnapshot } from '../shared/validation';

async function startReceiver(t: TestContext) {
    const { app, close } = createApp();
    const server = app.listen(0, '127.0.0.1');

    t.after(async () => {
        close();
        const stopped = new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);

                    return;
                }

                resolve();
            });
        });

        server.closeAllConnections();
        await stopped;
    });

    if (!server.listening) {
        await once(server, 'listening');
    }

    const address = server.address();

    assert.ok(address && typeof address !== 'string');

    const base = `http://127.0.0.1:${address.port}`;
    const configure = (settings: unknown) =>
        fetch(`${base}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
    const getSettings = async () =>
        parseReceiverSettings(await (await fetch(`${base}/api/settings`)).json());
    const getHistory = async () =>
        parseSnapshot(await (await fetch(`${base}/api/requests`)).json());

    return { base, configure, getSettings, getHistory };
}

void test(
    'configured responses apply to every incoming GET while GET metadata stays in shared history',
    { timeout: 10_000 },
    async (t) => {
        const { base, configure, getHistory, getSettings } = await startReceiver(t);
        const getResponse = {
            statusCode: 503,
            contentType: 'application/json',
            body: '{"error":"destination unavailable"}',
        };

        assert.deepEqual(await getSettings(), {
            responseDelayMs: 0,
            getResponse: DEFAULT_GET_RESPONSE,
        });

        assert.equal((await configure({ getResponse })).status, 200);

        for (const source of ['application-one', 'application-two']) {
            const response = await fetch(`${base}/webhook?source=${source}&key=one&key=two`, {
                headers: { 'X-Sender': source },
            });

            assert.equal(response.status, 503);
            assert.equal(response.headers.get('content-type'), 'application/json');
            assert.equal(await response.text(), getResponse.body);

            const request = (await getHistory()).requests[0];

            assert.ok(request);
            assert.equal(request.method, 'GET');
            assert.equal(request.rawBody, '');
            assert.equal(request.size, 0);
            assert.equal(request.headers['x-sender'], source);
            assert.equal(request.remoteIp, '127.0.0.1');
            assert.deepEqual(request.query, [
                ['source', source],
                ['key', 'one'],
                ['key', 'two'],
            ]);

            assert.match(request.timestamp, /\.\d{3}Z$/);
        }

        const post = await fetch(`${base}/webhook`, { method: 'POST', body: 'frame' });
        const latestRequest = (await getHistory()).requests[0];

        assert.ok(latestRequest);
        assert.equal(post.status, 200);
        assert.deepEqual(await post.json(), { ok: true, id: latestRequest.id });
        assert.equal((await getHistory()).total, 3);
    },
);

void test(
    'pending GET requests keep their arrival-time response configuration while new requests use updated settings',
    { timeout: 10_000 },
    async (t) => {
        const { base, configure, getHistory, getSettings } = await startReceiver(t);
        const originalResponse = {
            statusCode: 202,
            contentType: 'text/plain; charset=utf-8',
            body: 'original response',
        };
        const nextResponse = {
            statusCode: 200,
            contentType: 'text/plain',
            body: 'updated response',
        };

        await configure({ responseDelayMs: 1000, getResponse: originalResponse });

        let hasResponded = false;
        const startedAt = performance.now();
        const pending = fetch(`${base}/webhook?source=delayed`).then((response) => {
            hasResponded = true;

            return response;
        });
        const deadline = performance.now() + 2000;

        while ((await getHistory()).total === 0) {
            assert.ok(
                performance.now() < deadline,
                'Incoming GET should be captured while its response waits',
            );

            await sleep(10);
        }

        assert.equal(hasResponded, false);
        assert.equal((await configure({ getResponse: nextResponse })).status, 200);
        assert.equal((await getSettings()).responseDelayMs, 1000);
        assert.equal((await configure({ responseDelayMs: 0 })).status, 200);
        assert.deepEqual((await getSettings()).getResponse, nextResponse);

        const immediate = await fetch(`${base}/webhook?source=new`);

        assert.equal(await immediate.text(), nextResponse.body);
        assert.equal(hasResponded, false);

        const original = await pending;

        assert.ok(performance.now() - startedAt >= 1000);
        assert.equal(original.status, originalResponse.statusCode);
        assert.equal(original.headers.get('content-type'), originalResponse.contentType);
        assert.equal(await original.text(), originalResponse.body);
    },
);

void test(
    'invalid GET configuration is rejected without partially applying settings',
    { timeout: 10_000 },
    async (t) => {
        const { configure, getSettings } = await startReceiver(t);
        const original = await getSettings();

        for (const getResponse of [
            null,
            { ...DEFAULT_GET_RESPONSE, statusCode: 199 },
            { ...DEFAULT_GET_RESPONSE, statusCode: 600 },
            { ...DEFAULT_GET_RESPONSE, statusCode: 200.5 },
            { ...DEFAULT_GET_RESPONSE, contentType: 'text/plain\r\nX-Injected: true' },
            { ...DEFAULT_GET_RESPONSE, contentType: 'text/plain\n' },
            { ...DEFAULT_GET_RESPONSE, contentType: 'not a media type' },
            { ...DEFAULT_GET_RESPONSE, body: '\u00e9'.repeat(32_769) },
            { ...DEFAULT_GET_RESPONSE, statusCode: 204 },
        ]) {
            assert.equal((await configure({ responseDelayMs: 50, getResponse })).status, 400);
            assert.deepEqual(await getSettings(), original);
        }
    },
);

void test(
    'GET supports intentional malformed payloads, empty-body statuses and the response size boundary',
    { timeout: 10_000 },
    async (t) => {
        const { base, configure } = await startReceiver(t);

        assert.equal(
            (await configure({ getResponse: { ...DEFAULT_GET_RESPONSE, body: '{invalid-json' } }))
                .status,
            200,
        );

        assert.equal(await (await fetch(`${base}/webhook`)).text(), '{invalid-json');

        for (const statusCode of [204, 205, 304]) {
            assert.equal(
                (
                    await configure({
                        getResponse: { statusCode, contentType: 'text/plain', body: '' },
                    })
                ).status,
                200,
            );

            const response = await fetch(`${base}/webhook`);

            assert.equal(response.status, statusCode);
            assert.equal(await response.text(), '');
        }

        const body = '\0'.repeat(65_536);

        assert.equal(
            (await configure({ getResponse: { statusCode: 200, contentType: 'text/plain', body } }))
                .status,
            200,
        );

        assert.equal(await (await fetch(`${base}/webhook`)).text(), body);
    },
);
