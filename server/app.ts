import express, { type Express } from 'express';

import {
    API_ROUTES,
    CAPTURE_METHODS,
    DEFAULT_BODY_LIMIT,
    DEFAULT_GET_RESPONSE,
    DEFAULT_RESPONSE_DELAY_MS,
    HISTORY_CAPACITY,
    MAX_RESPONSE_DELAY_MS,
} from '../shared/constants';
import type { GetResponse } from '../shared/types';
import { isRecord, isResponseDelay, parseGetResponse } from '../shared/validation';
import { captureRequest } from './captureRequest';
import { handleRequestError, requireLocalAccess } from './middleware';
import { createRequestEvents } from './requestEvents';
import { createRequestHistory } from './requestHistory';
import { createResponseScheduler } from './responseScheduler';

interface AppOptions {
    readonly bodyLimit?: string | number;
    readonly capacity?: number;
    readonly publicDir?: string;
    readonly responseDelayMs?: number;
    readonly getResponse?: GetResponse;
}

interface LocalHook {
    readonly app: Express;
    readonly close: () => void;
}

export function createApp({
    bodyLimit = DEFAULT_BODY_LIMIT,
    capacity = HISTORY_CAPACITY,
    publicDir,
    responseDelayMs = DEFAULT_RESPONSE_DELAY_MS,
    getResponse: initialGetResponse = DEFAULT_GET_RESPONSE,
}: AppOptions = {}): LocalHook {
    if (!isResponseDelay(responseDelayMs)) {
        throw new Error(`Response delay must be an integer from 0 to ${MAX_RESPONSE_DELAY_MS}`);
    }

    const app = express();
    const history = createRequestHistory(capacity);
    const events = createRequestEvents();
    const responses = createResponseScheduler();
    let getResponse = parseGetResponse(initialGetResponse);

    app.disable('x-powered-by');
    app.use(requireLocalAccess);
    app.all(
        API_ROUTES.receiver,
        express.raw({ type: () => true, limit: bodyLimit, inflate: false }),
        (req, res) => {
            if (!CAPTURE_METHODS.some((method) => method === req.method)) {
                res.setHeader('Allow', CAPTURE_METHODS.join(', '));
                res.status(405).json({ error: `Use ${CAPTURE_METHODS.join(', ')}` });

                return;
            }

            const capturedRequest = captureRequest(req);

            history.add(capturedRequest);
            events.notify();
            responses.respond(res, {
                requestId: capturedRequest.id,
                delayMs: responseDelayMs,
                getResponse: req.method === 'GET' ? getResponse : undefined,
            });
        },
    );

    app.get(API_ROUTES.settings, (_req, res) => {
        res.setHeader('Cache-Control', 'no-store').json({ responseDelayMs, getResponse });
    });

    app.put(API_ROUTES.settings, express.json({ limit: '512kb' }), (req, res) => {
        const body: unknown = req.body;

        if (!isRecord(body) || (!('responseDelayMs' in body) && !('getResponse' in body))) {
            res.status(400).json({ error: 'Provide a response delay or GET response settings' });

            return;
        }

        if ('responseDelayMs' in body && !isResponseDelay(body.responseDelayMs)) {
            res.status(400).json({
                error: `Response delay must be an integer from 0 to ${MAX_RESPONSE_DELAY_MS} ms`,
            });

            return;
        }

        let nextGetResponse = getResponse;

        try {
            if ('getResponse' in body) {
                nextGetResponse = parseGetResponse(body.getResponse);
            }
        } catch (cause) {
            res.status(400).json({
                error: cause instanceof Error ? cause.message : 'Invalid GET response',
            });

            return;
        }

        if (isResponseDelay(body.responseDelayMs)) {
            responseDelayMs = body.responseDelayMs;
        }

        getResponse = nextGetResponse;
        res.json({ responseDelayMs, getResponse });
    });

    app.get(API_ROUTES.requests, (_req, res) => {
        res.setHeader('Cache-Control', 'no-store').json(history.snapshot());
    });

    app.delete(API_ROUTES.requests, (_req, res) => {
        history.clear();
        events.notify();
        res.status(204).end();
    });

    app.get(API_ROUTES.events, events.subscribe);

    if (publicDir) {
        app.use(express.static(publicDir, { etag: true }));
    }

    app.use(handleRequestError);

    function close(): void {
        responses.close();
        events.close();
    }

    return { app, close };
}
