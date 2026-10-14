import { fileURLToPath } from 'node:url';
import { createApp } from './app';
const API_ROUTES = { receiver: '/webhook', requests: '/api/requests', events: '/api/events' } as const;
const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_PORT = 17381;
const DEFAULT_BODY_LIMIT = '1mb';

const port = Number(process.env.PORT ?? DEFAULT_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
const bodyLimit = process.env.BODY_LIMIT ?? DEFAULT_BODY_LIMIT;
const { app, close } = createApp({ bodyLimit, publicDir: fileURLToPath(new URL('./public/', import.meta.url)) });
const server = app.listen(port, LOOPBACK_HOST, () => {
    console.log(`LocalHook dashboard: http://${LOOPBACK_HOST}:${port}`);
    console.log(`Request receiver:    http://${LOOPBACK_HOST}:${port}${API_ROUTES.receiver}`);
});
server.on('error', (error) => {
    console.error(`Unable to start LocalHook: ${error.message}`);
    process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        close();
        server.close();
        server.closeAllConnections();
    });
}
