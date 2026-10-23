import { randomUUID } from 'node:crypto';

import type { Request } from 'express';

import type { CapturedRequest } from '../shared/types';

function parseJsonBody(
    rawBody: string,
    contentType: string,
): Pick<CapturedRequest, 'jsonValid' | 'parsedJson'> {
    if (!rawBody || !/(?:\/json|\+json)(?:\s*;|$)/i.test(contentType)) {
        return { jsonValid: false };
    }

    try {
        const parsedJson: unknown = JSON.parse(rawBody);

        return { jsonValid: true, parsedJson };
    } catch {
        // Malformed JSON is still a valid capture; preserve its original bytes and text.
        return { jsonValid: false };
    }
}

export function captureRequest(request: Request): CapturedRequest {
    const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    const rawBody = body.toString('utf8');
    const contentType = request.get('content-type') ?? '';
    const headers = Object.fromEntries(
        Object.entries(request.headers).filter(
            (entry): entry is [string, string | string[]] => entry[1] !== undefined,
        ),
    );

    return {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.originalUrl,
        query: [...new URL(request.originalUrl, 'http://localhost').searchParams],
        headers,
        rawBody,
        bodyBase64: body.toString('base64'),
        ...parseJsonBody(rawBody, contentType),
        contentType,
        size: body.length,
        remoteIp: request.socket.remoteAddress ?? '',
    };
}
