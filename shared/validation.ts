import { MAX_RESPONSE_DELAY_MS } from './constants';
import type { CapturedRequest, ReceiverSettings, Snapshot } from './types';

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isResponseDelay(value: unknown): value is number {
    return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= MAX_RESPONSE_DELAY_MS
    );
}

export function parseReceiverSettings(value: unknown): ReceiverSettings {
    if (!isRecord(value) || !isResponseDelay(value.responseDelayMs)) {
        throw new Error('Invalid receiver settings');
    }

    return { responseDelayMs: value.responseDelayMs };
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');
}

function isQueryPair(value: unknown): value is [string, string] {
    return isStringArray(value) && value.length === 2;
}

function isCapturedRequest(value: unknown): value is CapturedRequest {
    if (!isRecord(value) || !isRecord(value.headers)) {
        return false;
    }

    return (
        typeof value.id === 'string' &&
        typeof value.timestamp === 'string' &&
        typeof value.method === 'string' &&
        typeof value.url === 'string' &&
        Array.isArray(value.query) &&
        value.query.every(isQueryPair) &&
        Object.values(value.headers).every(
            (header) => typeof header === 'string' || isStringArray(header),
        ) &&
        typeof value.rawBody === 'string' &&
        typeof value.bodyBase64 === 'string' &&
        typeof value.jsonValid === 'boolean' &&
        typeof value.contentType === 'string' &&
        typeof value.size === 'number' &&
        Number.isSafeInteger(value.size) &&
        value.size >= 0 &&
        typeof value.remoteIp === 'string'
    );
}

export function parseSnapshot(value: unknown): Snapshot {
    if (
        !isRecord(value) ||
        !Array.isArray(value.requests) ||
        !value.requests.every(isCapturedRequest) ||
        typeof value.total !== 'number' ||
        !Number.isSafeInteger(value.total) ||
        value.total < 0 ||
        typeof value.capacity !== 'number' ||
        !Number.isSafeInteger(value.capacity) ||
        value.capacity < 1 ||
        value.requests.length > value.capacity ||
        value.requests.length > value.total
    ) {
        throw new Error('Invalid request history');
    }

    return { requests: value.requests, total: value.total, capacity: value.capacity };
}
