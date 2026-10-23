import type { RequestHandler, Response } from 'express';

import { REFRESH_EVENT } from '../shared/constants';

const BROADCAST_DELAY_MS = 80;
const SSE_RETRY_MS = 1_500;
const SSE_HEARTBEAT_MS = 15_000;
const REFRESH_NOTIFICATION = `event: ${REFRESH_EVENT}\ndata: {}\n\n`;

export interface RequestEvents {
    notify: () => void;
    subscribe: RequestHandler;
    close: () => void;
}

export function createRequestEvents(): RequestEvents {
    const clients = new Map<Response, ReturnType<typeof setInterval>>();
    let broadcastTimer: ReturnType<typeof setTimeout> | undefined;

    function notify(): void {
        if (broadcastTimer) {
            return;
        }

        // Batch invalidations so clients fetch bounded snapshots instead of queuing payloads.
        broadcastTimer = setTimeout(() => {
            broadcastTimer = undefined;

            for (const client of clients.keys()) {
                if (!client.write(REFRESH_NOTIFICATION)) {
                    client.destroy();
                }
            }
        }, BROADCAST_DELAY_MS);

        broadcastTimer.unref();
    }

    const subscribe: RequestHandler = (_req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        res.write(`retry: ${SSE_RETRY_MS}\n${REFRESH_NOTIFICATION}`);

        const heartbeatTimer = setInterval(() => {
            if (!res.write(': heartbeat\n\n')) {
                res.destroy();
            }
        }, SSE_HEARTBEAT_MS);

        heartbeatTimer.unref();
        clients.set(res, heartbeatTimer);
        res.once('close', () => {
            clearInterval(heartbeatTimer);
            clients.delete(res);
        });
    };

    function close(): void {
        clearTimeout(broadcastTimer);
        broadcastTimer = undefined;

        for (const [client, heartbeatTimer] of clients) {
            clearInterval(heartbeatTimer);
            client.destroy();
        }

        clients.clear();
    }

    return { notify, subscribe, close };
}
