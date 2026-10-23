import { MAX_GET_RESPONSE_BYTES, MAX_RESPONSE_DELAY_MS } from './constants';
import type { CapturedRequest, GetResponse, ReceiverSettings, Snapshot } from './types';

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

    return {
        responseDelayMs: value.responseDelayMs,
        getResponse: parseGetResponse(value.getResponse),
    };
}

export function parseGetResponse(value: unknown): GetResponse {
    if (
        !isRecord(value) ||
        typeof value.statusCode !== 'number' ||
        !Number.isInteger(value.statusCode) ||
        value.statusCode < 200 ||
        value.statusCode > 599
    ) {
        throw new Error('GET response status must be an integer from 200 to 599');
    }

    if (
        typeof value.contentType !== 'string' ||
        value.contentType.length > 256 ||
        /[^\x20-\x7e]/.test(value.contentType) ||
        !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?: *;[ -~]*)?$/i.test(value.contentType)
    ) {
        throw new Error('GET response content type must be a valid media type without line breaks');
    }

    if (
        typeof value.body !== 'string' ||
        new TextEncoder().encode(value.body).byteLength > MAX_GET_RESPONSE_BYTES
    ) {
        throw new Error('GET response body must be text of at most 65536 UTF-8 bytes');
    }

    if ([204, 205, 304].includes(value.statusCode) && value.body !== '') {
        throw new Error('GET responses with status 204, 205 or 304 must have an empty body');
    }

    return { statusCode: value.statusCode, contentType: value.contentType, body: value.body };
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
