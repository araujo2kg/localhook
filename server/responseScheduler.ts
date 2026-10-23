import type { Response } from 'express';

import type { GetResponse } from '../shared/types';

interface ResponseOptions {
    readonly requestId: string;
    readonly delayMs: number;
    readonly getResponse?: GetResponse;
}

export interface ResponseScheduler {
    respond: (response: Response, options: ResponseOptions) => void;
    close: () => void;
}

export function createResponseScheduler(): ResponseScheduler {
    const pendingResponses = new Map<Response, ReturnType<typeof setTimeout>>();

    function respond(
        response: Response,
        { requestId, delayMs, getResponse }: ResponseOptions,
    ): void {
        response.setHeader('Cache-Control', 'no-store');

        function sendResponse(): void {
            if (response.destroyed) {
                return;
            }

            if (getResponse) {
                response
                    .status(getResponse.statusCode)
                    .setHeader('Content-Type', getResponse.contentType);

                response.end(getResponse.body);

                return;
            }

            response.json({ ok: true, id: requestId });
        }

        if (delayMs === 0) {
            sendResponse();

            return;
        }

        function cleanup(): void {
            clearTimeout(pendingResponses.get(response));
            pendingResponses.delete(response);
            response.off('close', cleanup);
        }

        // Keep the arrival-time delay so later settings changes cannot shorten this wait.
        const timer = setTimeout(() => {
            cleanup();

            sendResponse();
        }, delayMs);

        timer.unref();
        pendingResponses.set(response, timer);
        response.once('close', cleanup);
    }

    function close(): void {
        for (const [response, timer] of pendingResponses) {
            clearTimeout(timer);
            response.destroy();
        }

        pendingResponses.clear();
    }

    return { respond, close };
}
