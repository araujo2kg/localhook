import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadConfig } from '../server/config';

test('loads .env values, applies shell overrides, and keeps defaults when the file is absent', () => {
    const directory = mkdtempSync(join(tmpdir(), 'localhook-config-'));
    const envPath = join(directory, '.env');
    try {
        assert.deepEqual(loadConfig(envPath, {}), { port: 17381, bodyLimit: '1mb' });
        writeFileSync(envPath, '# Local settings\nPORT=18000\nBODY_LIMIT="2mb"\n');
        assert.deepEqual(loadConfig(envPath, {}), { port: 18000, bodyLimit: '2mb' });
        assert.deepEqual(loadConfig(envPath, { PORT: '19000', BODY_LIMIT: '512kb' }), { port: 19000, bodyLimit: '512kb' });
        assert.deepEqual(loadConfig(envPath, { PORT: '19000' }), { port: 19000, bodyLimit: '2mb' });
        assert.throws(() => loadConfig(directory, {}));
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test('rejects invalid configured ports', () => {
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
