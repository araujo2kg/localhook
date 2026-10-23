import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { loadConfig } from '../server/config';

void test('loads .env values, applies shell overrides, and keeps defaults when the file is absent', () => {
    const directory = mkdtempSync(join(tmpdir(), 'localhook-config-'));
    const envPath = join(directory, '.env');

    try {
        assert.deepEqual(loadConfig(envPath, {}), {
            port: 17381,
            bodyLimit: '1mb',
            responseDelayMs: 0,
        });

        writeFileSync(envPath, '# Local settings\nPORT=18000\nBODY_LIMIT="2mb"\n');
        assert.deepEqual(loadConfig(envPath, {}), {
            port: 18000,
            bodyLimit: '2mb',
            responseDelayMs: 0,
        });

        assert.deepEqual(loadConfig(envPath, { PORT: '19000', BODY_LIMIT: '512kb' }), {
            port: 19000,
            bodyLimit: '512kb',
            responseDelayMs: 0,
        });

        assert.deepEqual(loadConfig(envPath, { PORT: '19000' }), {
            port: 19000,
            bodyLimit: '2mb',
            responseDelayMs: 0,
        });

        assert.throws(() => loadConfig(directory, {}));
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

void test('loads response delay with shell overrides and rejects invalid delays', () => {
    const directory = mkdtempSync(join(tmpdir(), 'localhook-delay-config-'));
    const envPath = join(directory, '.env');

    try {
        writeFileSync(envPath, 'RESPONSE_DELAY_MS=1500\n');
        assert.equal(loadConfig(envPath, {}).responseDelayMs, 1500);
        assert.equal(loadConfig(envPath, { RESPONSE_DELAY_MS: '0' }).responseDelayMs, 0);
        assert.equal(
            loadConfig(envPath, { RESPONSE_DELAY_MS: '3600000' }).responseDelayMs,
            3600000,
        );

        for (const value of ['', ' ', '-1', '0.5', 'abc', 'Infinity', '3600001']) {
            assert.throws(
                () => loadConfig(envPath, { RESPONSE_DELAY_MS: value }),
                /RESPONSE_DELAY_MS must be an integer/,
            );
        }
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

void test('rejects invalid configured ports', () => {
    const directory = mkdtempSync(join(tmpdir(), 'localhook-config-'));
    const envPath = join(directory, '.env');

    try {
        for (const port of ['', '0', '-1', '65536', '1.5', 'abc']) {
            writeFileSync(envPath, `PORT=${port}\n`);
            assert.throws(() => loadConfig(envPath, {}), /PORT must be an integer from 1 to 65535/);
        }
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
