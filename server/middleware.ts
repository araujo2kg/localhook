import type { ErrorRequestHandler, RequestHandler } from 'express';

import { LOOPBACK_HOST } from '../shared/constants';
import { isRecord } from '../shared/validation';

const LOCAL_HOSTS = [LOOPBACK_HOST, 'localhost', '[::1]'];

export const requireLocalAccess: RequestHandler = (req, res, next) => {
    // Reject foreign browser origins and DNS-rebinding hosts; webhook clients need no Origin.
    if (!LOCAL_HOSTS.includes(req.hostname)) {
        res.status(403).json({ error: 'Local hosts only' });

        return;
    }

    const origin = req.get('origin');
    const host = req.get('host') ?? '';

    if (req.path.startsWith('/api/') && origin && origin !== `${req.protocol}://${host}`) {
        res.status(403).json({ error: 'Same-origin requests only' });

        return;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    );

    next();
};

function errorStatus(error: unknown): number {
    if (
        isRecord(error) &&
        typeof error.status === 'number' &&
        error.status >= 400 &&
        error.status < 500
    ) {
        return error.status;
    }

    return 500;
}

function errorMessage(status: number): string {
    if (status === 413) {
        return 'Request body exceeds the configured limit';
    }

    if (status === 415) {
        return 'Compressed bodies are not supported';
    }

    return 'Unable to process request';
}

export const handleRequestError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const status = errorStatus(error);

    res.status(status).json({ error: errorMessage(status) });
};
