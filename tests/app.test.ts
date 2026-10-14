import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { after, before, test } from 'node:test';
import { createApp } from '../server/app';
import type { Snapshot } from '../shared/types';

const { app, close } = createApp({ bodyLimit: 1024 });
const server = app.listen(0, '127.0.0.1');
let base: string;
before(async () => {
    if (!server.listening) await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
    close();
    const stopped = new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    server.closeAllConnections();
    await stopped;
});

const capture = (body?: string | Uint8Array<ArrayBuffer>, headers: Record<string, string> = {}, path = '/webhook', method = 'POST') => fetch(`${base}${path}`, { method, body, headers });
const history = async (): Promise<Snapshot> => (await fetch(`${base}/api/requests`)).json();

test('captures JSON, metadata, repeated query values, and headers', async () => {
    const response = await capture('{"hello":"world"}', { 'Content-Type': 'application/json', 'X-Test': 'example' }, '/webhook?key=one&key=two');
    assert.equal(response.status, 200);
    const acknowledgment = await response.json();
    const request = (await history()).requests[0];
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
});

test('captures plain text, invalid JSON, forms, empty bodies, and JSON primitives', async () => {
    for (const [body, type, valid] of [
        ['hello\nworld', 'text/plain', false],
        ['{"broken":', 'application/json', false],
        ['a=1&a=2', 'application/x-www-form-urlencoded', false],
        ['', 'application/json', false],
        ['null', 'application/json', true],
        ['false', 'application/problem+json; charset=utf-8', true],
    ] as const) {
        assert.equal((await capture(body, { 'Content-Type': type })).status, 200);
        const request = (await history()).requests[0];
        assert.equal(request.rawBody, body);
        assert.equal(request.jsonValid, valid);
    }
    assert.equal((await capture()).status, 200);
    assert.equal((await history()).requests[0].size, 0);
});

test('preserves original binary bytes', async () => {
    const body = new Uint8Array([0, 255, 128, 65]);
    await capture(body, { 'Content-Type': 'application/octet-stream' });
    assert.deepEqual(Buffer.from((await history()).requests[0].bodyBase64, 'base64'), Buffer.from(body));
});

test('supports PUT and PATCH and rejects GET without capturing', async () => {
    for (const method of ['PUT', 'PATCH']) {
        assert.equal((await capture('example', {}, '/webhook', method)).status, 200);
        assert.equal((await history()).requests[0].method, method);
    }
    const before = (await history()).total;
    assert.equal((await fetch(`${base}/webhook`)).status, 405);
    assert.equal((await history()).total, before);
});

test('rejects oversized bodies without changing history', async () => {
    const before = (await history()).total;
    const response = await capture('x'.repeat(1025));
    assert.equal(response.status, 413);
    assert.equal((await history()).total, before);
});

test('keeps newest first and evicts beyond 500 requests', async () => {
    await fetch(`${base}/api/requests`, { method: 'DELETE' });
    for (let index = 0; index < 502; index++) await capture(String(index));
    const snapshot = await history();
    assert.equal(snapshot.requests.length, 500);
    assert.equal(snapshot.total, 502);
    assert.equal(snapshot.requests[0].rawBody, '501');
    assert.equal(snapshot.requests[499].rawBody, '2');
    assert.equal(new Set(snapshot.requests.map((request) => request.id)).size, 500);
});

test('clears history and resets total', async () => {
    assert.equal((await fetch(`${base}/api/requests`, { method: 'DELETE' })).status, 204);
    assert.deepEqual(await history(), { requests: [], total: 0, capacity: 500 });
});

test('blocks foreign browser origins and rebinding hosts', async () => {
    const response = await fetch(`${base}/api/requests`, { method: 'DELETE', headers: { Origin: 'https://example.com' } });
    assert.equal(response.status, 403);
    const status = await new Promise<number | undefined>((resolve, reject) => {
        const request = httpRequest(`${base}/api/requests`, { headers: { Host: 'evil.example' } }, (response) => {
            response.resume();
            resolve(response.statusCode);
        });
        request.on('error', reject);
        request.end();
    });
    assert.equal(status, 403);
    assert.equal((await fetch(`${base}/api/requests`, { headers: { Origin: base } })).status, 200);
});

test('SSE sends initial synchronization and refresh notifications after capture and clear', async () => {
    const controller = new AbortController();
    const response = await fetch(`${base}/api/events`, { signal: controller.signal });
    assert.equal(response.headers.get('content-type'), 'text/event-stream');
    const reader = response.body!.getReader();
    const readEvent = async () => {
        const timeout = setTimeout(() => controller.abort(), 3000);
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
        await reader.cancel().catch(() => {});
    }
});
