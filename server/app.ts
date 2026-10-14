import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler, type Response } from 'express';
import type { CapturedRequest, Snapshot } from '../shared/types';
const API_ROUTES = { receiver: '/webhook', requests: '/api/requests', events: '/api/events' } as const;
const CAPTURE_METHODS = ['POST', 'PUT', 'PATCH'] as const;
const DEFAULT_BODY_LIMIT = '1mb';
const HISTORY_CAPACITY = 500;
const LOOPBACK_HOST = '127.0.0.1';
const REFRESH_EVENT = 'refresh';

const BROADCAST_DELAY_MS = 80;
const SSE_RETRY_MS = 1_500;
const SSE_HEARTBEAT_MS = 15_000;
const LOCAL_HOSTS = [LOOPBACK_HOST, 'localhost', '[::1]'];
const REFRESH_NOTIFICATION = `event: ${REFRESH_EVENT}\ndata: {}\n\n`;

interface Options {
    bodyLimit?: string | number;
    capacity?: number;
    publicDir?: string;
}

export function createApp({ bodyLimit = DEFAULT_BODY_LIMIT, capacity = HISTORY_CAPACITY, publicDir }: Options = {}) {
    const app = express();
    const requests: CapturedRequest[] = [];
    const clients = new Set<Response>();
    let total = 0;
    let pending: ReturnType<typeof setTimeout> | undefined;
    app.disable('x-powered-by');

    //#region Local access
    // Reject foreign browser origins and DNS-rebinding hosts. Non-browser webhook clients need no Origin header.
    app.use((req, res, next) => {
        if (!LOCAL_HOSTS.includes(req.hostname)) {
            res.status(403).json({ error: 'Local hosts only' });
            return;
        }
        const origin = req.get('origin');
        if (req.path.startsWith('/api/') && origin && origin !== `${req.protocol}://${req.get('host')}`) {
            res.status(403).json({ error: 'Same-origin requests only' });
            return;
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'");
        next();
    });

    //#endregion

    //#region History and notifications
    const snapshot = (): Snapshot => ({ requests, total, capacity });
    // Invalidate in batches; clients fetch one bounded snapshot instead of queuing full payloads.
    const broadcast = () => {
        if (pending) return;
        pending = setTimeout(() => {
            pending = undefined;
            for (const client of clients) {
                if (!client.write(REFRESH_NOTIFICATION)) client.destroy();
            }
        }, BROADCAST_DELAY_MS);
        pending.unref();
    };

    //#endregion

    //#region Request capture
    app.all(API_ROUTES.receiver, express.raw({ type: () => true, limit: bodyLimit, inflate: false }), (req, res) => {
        if (!CAPTURE_METHODS.some((method) => method === req.method)) {
            res.setHeader('Allow', CAPTURE_METHODS.join(', '));
            res.status(405).json({ error: 'Use POST, PUT, or PATCH' });
            return;
        }
        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        const rawBody = body.toString('utf8');
        const contentType = req.get('content-type') ?? '';
        let jsonValid = false;
        let parsedJson: unknown;
        if (/(?:\/json|\+json)(?:\s*;|$)/i.test(contentType) && body.length) {
            try {
                parsedJson = JSON.parse(rawBody);
                jsonValid = true;
            } catch {
                // Preserve malformed JSON as raw text.
            }
        }
        const captured: CapturedRequest = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            query: [...new URL(req.originalUrl, 'http://localhost').searchParams],
            headers: Object.fromEntries(Object.entries(req.headers).filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)),
            rawBody,
            bodyBase64: body.toString('base64'),
            jsonValid,
            parsedJson,
            contentType,
            size: body.length,
            remoteIp: req.socket.remoteAddress ?? '',
        };
        requests.unshift(captured);
        if (requests.length > capacity) requests.pop();
        total += 1;
        broadcast();
        res.json({ ok: true, id: captured.id });
    });

    //#endregion

    //#region Dashboard API
    app.get(API_ROUTES.requests, (_req, res) => res.setHeader('Cache-Control', 'no-store').json(snapshot()));
    app.delete(API_ROUTES.requests, (_req, res) => {
        requests.length = 0;
        total = 0;
        broadcast();
        res.status(204).end();
    });
    app.get(API_ROUTES.events, (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(`retry: ${SSE_RETRY_MS}\n${REFRESH_NOTIFICATION}`);
        clients.add(res);
        const heartbeat = setInterval(() => {
            if (!res.write(': heartbeat\n\n')) res.destroy();
        }, SSE_HEARTBEAT_MS);
        heartbeat.unref();
        req.on('close', () => {
            clearInterval(heartbeat);
            clients.delete(res);
        });
    });

    //#endregion

    //#region Static assets and errors
    if (publicDir) app.use(express.static(publicDir, { etag: true }));
    const onError: ErrorRequestHandler = (error, _req, res, _next) => {
        const status = typeof error.status === 'number' && error.status >= 400 && error.status < 500 ? error.status : 500;
        res.status(status).json({ error: status === 413 ? 'Request body exceeds the configured limit' : status === 415 ? 'Compressed bodies are not supported' : 'Unable to process request' });
    };
    app.use(onError);
    //#endregion

    return {
        app,
        close: () => {
            if (pending) clearTimeout(pending);
            for (const client of clients) client.destroy();
        },
    };
}
