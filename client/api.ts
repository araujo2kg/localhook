import { API_ROUTES } from '../shared/constants';
import type { GetResponse, ReceiverSettings, Snapshot } from '../shared/types';
import { parseReceiverSettings, parseSnapshot } from '../shared/validation';

async function fetchResponse(path: string, options: RequestInit): Promise<Response> {
    const response = await fetch(path, options);

    if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}`);
    }

    return response;
}

async function fetchJson(path: string, options: RequestInit): Promise<unknown> {
    const response = await fetchResponse(path, options);
    const value: unknown = await response.json();

    return value;
}

export async function getReceiverSettings(signal: AbortSignal): Promise<ReceiverSettings> {
    const value = await fetchJson(API_ROUTES.settings, { signal, cache: 'no-store' });

    return parseReceiverSettings(value);
}

export async function updateReceiverSettings(
    responseDelayMs: number,
    signal: AbortSignal,
): Promise<ReceiverSettings> {
    const value = await fetchJson(API_ROUTES.settings, {
        method: 'PUT',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseDelayMs }),
    });

    return parseReceiverSettings(value);
}

export async function getRequestHistory(signal: AbortSignal): Promise<Snapshot> {
    const value = await fetchJson(API_ROUTES.requests, { signal, cache: 'no-store' });

    return parseSnapshot(value);
}

export async function clearRequestHistory(): Promise<void> {
    await fetchResponse(API_ROUTES.requests, { method: 'DELETE' });
}

export async function updateGetResponse(
    getResponse: GetResponse,
    signal: AbortSignal,
): Promise<ReceiverSettings> {
    const value = await fetchJson(API_ROUTES.settings, {
        method: 'PUT',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ getResponse }),
    });

    return parseReceiverSettings(value);
}
