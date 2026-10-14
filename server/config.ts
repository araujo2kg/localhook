import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { DEFAULT_BODY_LIMIT, DEFAULT_PORT } from '../shared/constants';

const MIN_PORT = 1;
const MAX_PORT = 65_535;

export function loadConfig(envPath = '.env', environment: NodeJS.ProcessEnv = process.env) {
    let fileValues: NodeJS.ProcessEnv = {};
    try {
        fileValues = parseEnv(readFileSync(envPath, 'utf8'));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const port = Number(environment.PORT ?? fileValues.PORT ?? DEFAULT_PORT);
    if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) throw new Error(`PORT must be an integer from ${MIN_PORT} to ${MAX_PORT}`);
    const bodyLimit = environment.BODY_LIMIT ?? fileValues.BODY_LIMIT ?? DEFAULT_BODY_LIMIT;
    return { port, bodyLimit };
}
