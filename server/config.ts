import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import {
    DEFAULT_BODY_LIMIT,
    DEFAULT_PORT,
    DEFAULT_RESPONSE_DELAY_MS,
    MAX_RESPONSE_DELAY_MS,
} from '../shared/constants';
import { isRecord, isResponseDelay } from '../shared/validation';

const MIN_PORT = 1;
const MAX_PORT = 65_535;

interface AppConfig {
    readonly port: number;
    readonly bodyLimit: string;
    readonly responseDelayMs: number;
}

export function loadConfig(
    envPath = '.env',
    environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
    let fileValues: NodeJS.ProcessEnv = {};

    try {
        fileValues = parseEnv(readFileSync(envPath, 'utf8'));
    } catch (error) {
        if (!isRecord(error) || error.code !== 'ENOENT') {
            throw error;
        }
    }

    const port = Number(environment.PORT ?? fileValues.PORT ?? DEFAULT_PORT);

    if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
        throw new Error(`PORT must be an integer from ${MIN_PORT} to ${MAX_PORT}`);
    }

    const bodyLimit = environment.BODY_LIMIT ?? fileValues.BODY_LIMIT ?? DEFAULT_BODY_LIMIT;
    const delayValue = environment.RESPONSE_DELAY_MS ?? fileValues.RESPONSE_DELAY_MS;
    const responseDelayMs =
        delayValue === undefined ? DEFAULT_RESPONSE_DELAY_MS : Number(delayValue);

    if (delayValue?.trim() === '' || !isResponseDelay(responseDelayMs)) {
        throw new Error(`RESPONSE_DELAY_MS must be an integer from 0 to ${MAX_RESPONSE_DELAY_MS}`);
    }

    return { port, bodyLimit, responseDelayMs };
}
