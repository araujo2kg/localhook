import type { Response } from 'express';

export interface ResponseScheduler {
    respond: (response: Response, requestId: string, delayMs: number) => void;
    close: () => void;
}

export function createResponseScheduler(): ResponseScheduler {
    const pendingResponses = new Map<Response, ReturnType<typeof setTimeout>>();

    function respond(response: Response, requestId: string, delayMs: number): void {
        if (delayMs === 0) {
            response.json({ ok: true, id: requestId });

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

            if (!response.destroyed) {
                response.json({ ok: true, id: requestId });
            }
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
