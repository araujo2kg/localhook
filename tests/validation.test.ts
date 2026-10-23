import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CapturedRequest } from '../shared/types';
import { parseReceiverSettings, parseSnapshot } from '../shared/validation';

const CAPTURED_REQUEST: CapturedRequest = {
    id: 'example-request',
    timestamp: '2026-10-23T12:00:00.000Z',
    method: 'POST',
    url: '/webhook?key=one&key=two',
    headers: { 'content-type': 'application/json', 'x-example': ['one', 'two'] },
    query: [
        ['key', 'one'],
        ['key', 'two'],
    ],
    rawBody: '{"event":"example"}',
    bodyBase64: 'eyJldmVudCI6ImV4YW1wbGUifQ==',
    jsonValid: true,
    parsedJson: { event: 'example' },
    contentType: 'application/json',
    size: 19,
    remoteIp: '127.0.0.1',
};

void test('accepts receiver delay boundaries and rejects malformed API settings', () => {
    assert.deepEqual(parseReceiverSettings({ responseDelayMs: 0 }), { responseDelayMs: 0 });
    assert.deepEqual(parseReceiverSettings({ responseDelayMs: 3_600_000 }), {
        responseDelayMs: 3_600_000,
    });

    for (const responseDelayMs of [-1, 0.5, 3_600_001, '100', null, true]) {
        assert.throws(
            () => parseReceiverSettings({ responseDelayMs }),
            /Invalid receiver settings/,
        );
    }

    assert.throws(() => parseReceiverSettings(null), /Invalid receiver settings/);
    assert.throws(() => parseReceiverSettings({}), /Invalid receiver settings/);
});

void test('retains captured payloads, repeated query values and multivalue headers after validation', () => {
    const snapshot = { requests: [CAPTURED_REQUEST], total: 5, capacity: 500 };

    assert.deepEqual(parseSnapshot(snapshot), snapshot);
    assert.deepEqual(parseSnapshot({ requests: [], total: 0, capacity: 500 }), {
        requests: [],
        total: 0,
        capacity: 500,
    });
});

void test('rejects malformed snapshots before dashboard state can consume them', () => {
    for (const value of [
        null,
        { requests: [], total: -1, capacity: 500 },
        { requests: [], total: 0.5, capacity: 500 },
        { requests: [CAPTURED_REQUEST], total: 0, capacity: 500 },
        { requests: [CAPTURED_REQUEST], total: 1, capacity: 0 },
        { requests: [null], total: 1, capacity: 500 },
        { requests: [{ ...CAPTURED_REQUEST, headers: { invalid: 42 } }], total: 1, capacity: 500 },
        {
            requests: [{ ...CAPTURED_REQUEST, query: [['missing-value']] }],
            total: 1,
            capacity: 500,
        },
        { requests: [{ ...CAPTURED_REQUEST, rawBody: null }], total: 1, capacity: 500 },
    ]) {
        assert.throws(() => parseSnapshot(value), /Invalid request history/);
    }
});
