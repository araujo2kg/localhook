import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { after, before, test } from 'node:test';

import { createApp } from '../server/app';
import type { Snapshot } from '../shared/types';
import { isRecord, parseSnapshot } from '../shared/validation';

const { app, close } = createApp({ bodyLimit: 1024 });
const server = app.listen(0, '127.0.0.1');
let base: string;

before(async () => {
    if (!server.listening) {
        await once(server, 'listening');
    }

    const address = server.address();

    assert.ok(address && typeof address !== 'string');
    base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
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

const capture = (
    body?: string | Uint8Array<ArrayBuffer>,
    headers: Record<string, string> = {},
    path = '/webhook',
    method = 'POST',
) => fetch(`${base}${path}`, { method, body, headers });

async function history(): Promise<Snapshot> {
    const response = await fetch(`${base}/api/requests`);

    return parseSnapshot(await response.json());
}

async function capturedAt(index = 0) {
    const request = (await history()).requests[index];

    assert.ok(request, `Expected a captured request at index ${index}`);

    return request;
}

void test(
    'incoming GET requests appear in history with query metadata and the default response',
    { timeout: 10_000 },
    async () => {
        const capturedIds = new Set<string>();

        for (let attempt = 0; attempt < 2; attempt++) {
            const response = await fetch(`${base}/webhook?source=get-test&key=one&key=two`);
            const acknowledgment: unknown = await response.json();
            const request = await capturedAt();

            assert.equal(response.status, 200);
            assert.match(response.headers.get('content-type') ?? '', /^application\/json/);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            assert.deepEqual(acknowledgment, { ok: true });
            assert.equal(request.method, 'GET');
            assert.equal(request.rawBody, '');
            assert.equal(request.size, 0);
            assert.deepEqual(request.query, [
                ['source', 'get-test'],
                ['key', 'one'],
                ['key', 'two'],
            ]);

            capturedIds.add(request.id);
        }

        assert.equal(capturedIds.size, 2);
    },
);

void test(
    'captures JSON, metadata, repeated query values, and headers',
    { timeout: 10_000 },
    async () => {
        const response = await capture(
            '{"hello":"world"}',
            { 'Content-Type': 'application/json', 'X-Test': 'example' },
            '/webhook?key=one&key=two',
        );

        assert.equal(response.status, 200);
        const acknowledgment: unknown = await response.json();
        const request = await capturedAt();

        assert.ok(isRecord(acknowledgment));
        assert.equal(request.id, acknowledgment.id);
        assert.equal(request.method, 'POST');
        assert.equal(request.jsonValid, true);
        assert.deepEqual(request.parsedJson, { hello: 'world' });
        assert.equal(request.rawBody, '{"hello":"world"}');
        assert.equal(request.size, Buffer.byteLength(request.rawBody));
        assert.equal(request.headers['x-test'], 'example');
        assert.deepEqual(request.query, [
            ['key', 'one'],
            ['key', 'two'],
        ]);

        assert.match(request.timestamp, /\.\d{3}Z$/);
        assert.equal(request.remoteIp, '127.0.0.1');
    },
);

void test(
    'captures plain text, invalid JSON, forms, empty bodies, and JSON primitives',
    { timeout: 10_000 },
    async () => {
        for (const [body, type, valid] of [
            ['hello\nworld', 'text/plain', false],
            ['{"broken":', 'application/json', false],
            ['a=1&a=2', 'application/x-www-form-urlencoded', false],
            ['', 'application/json', false],
            ['null', 'application/json', true],
            ['false', 'application/problem+json; charset=utf-8', true],
        ] as const) {
            assert.equal((await capture(body, { 'Content-Type': type })).status, 200);
            const request = await capturedAt();

            assert.equal(request.rawBody, body);
            assert.equal(request.jsonValid, valid);
        }

        assert.equal((await capture()).status, 200);
        assert.equal((await capturedAt()).size, 0);
    },
);

void test('preserves original binary bytes', { timeout: 10_000 }, async () => {
    const body = new Uint8Array([0, 255, 128, 65]);

    await capture(body, { 'Content-Type': 'application/octet-stream' });
    assert.deepEqual(Buffer.from((await capturedAt()).bodyBase64, 'base64'), Buffer.from(body));
});

void test(
    'supports GET, PUT and PATCH and rejects unsupported methods without capturing',
    { timeout: 10_000 },
    async () => {
        for (const method of ['GET', 'PUT', 'PATCH']) {
            assert.equal(
                (await capture(method === 'GET' ? undefined : 'example', {}, '/webhook', method))
                    .status,
                200,
            );

            assert.equal((await capturedAt()).method, method);
        }

        const before = (await history()).total;
        const response = await fetch(`${base}/webhook`, { method: 'DELETE' });

        assert.equal(response.status, 405);
        assert.equal(response.headers.get('allow'), 'GET, POST, PUT, PATCH');
        assert.equal((await history()).total, before);
    },
);

void test('rejects oversized bodies without changing history', { timeout: 10_000 }, async () => {
    const before = (await history()).total;
    const response = await capture('x'.repeat(1025));

    assert.equal(response.status, 413);
    assert.equal((await history()).total, before);
});

void test('keeps newest first and evicts beyond 500 requests', { timeout: 10_000 }, async () => {
    await fetch(`${base}/api/requests`, { method: 'DELETE' });
    for (let index = 0; index < 502; index++) {
        await capture(String(index));
    }

    const snapshot = await history();

    assert.equal(snapshot.requests.length, 500);
    assert.equal(snapshot.total, 502);
    assert.equal(snapshot.requests[0]?.rawBody, '501');
    assert.equal(snapshot.requests[499]?.rawBody, '2');
    assert.equal(new Set(snapshot.requests.map((request) => request.id)).size, 500);
});

void test('clears history and resets total', { timeout: 10_000 }, async () => {
    assert.equal((await fetch(`${base}/api/requests`, { method: 'DELETE' })).status, 204);
    assert.deepEqual(await history(), { requests: [], total: 0, capacity: 500 });
});

void test('blocks foreign browser origins and rebinding hosts', { timeout: 10_000 }, async () => {
    const response = await fetch(`${base}/api/requests`, {
        method: 'DELETE',
        headers: { Origin: 'https://example.com' },
    });

    assert.equal(response.status, 403);
    const status = await new Promise<number | undefined>((resolve, reject) => {
        const request = httpRequest(
            `${base}/api/requests`,
            { headers: { Host: 'evil.example' } },
            (response) => {
                response.resume();
                resolve(response.statusCode);
            },
        );

        request.on('error', reject);
        request.end();
    });

    assert.equal(status, 403);
    assert.equal((await fetch(`${base}/api/requests`, { headers: { Origin: base } })).status, 200);
});

void test(
    'SSE sends initial synchronization and refresh notifications after capture and clear',
    { timeout: 10_000 },
    async () => {
        const controller = new AbortController();
        const response = await fetch(`${base}/api/events`, { signal: controller.signal });

        assert.equal(response.headers.get('content-type'), 'text/event-stream');
        assert.ok(response.body);

        const reader = response.body.getReader();
        const readEvent = async () => {
            const timeout = setTimeout(() => {
                controller.abort();
            }, 3000);

            try {
                let text = '';

                while (!text.includes('event: refresh')) {
                    const chunk = await reader.read();

                    assert.equal(chunk.done, false);
                    text += new TextDecoder().decode(chunk.value);
                }

                return text;
            } finally {
                clearTimeout(timeout);
            }
        };

        try {
            assert.match(await readEvent(), /retry: 1500/);
            // Drain any notification already scheduled by an earlier test.
            await new Promise((resolve) => setTimeout(resolve, 100));
            await capture('live');
            assert.match(await readEvent(), /data: \{\}/);
            await fetch(`${base}/api/requests`, { method: 'DELETE' });
            assert.match(await readEvent(), /data: \{\}/);
        } finally {
            controller.abort();
            await reader.cancel().catch(() => {
                // Aborting the fetch can close the reader before explicit cancellation.
            });
        }
    },
);
