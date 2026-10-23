import { fileURLToPath } from 'node:url';

import { API_ROUTES, LOOPBACK_HOST } from '../shared/constants';
import { createApp } from './app';
import { loadConfig } from './config';

const { port, bodyLimit, responseDelayMs } = loadConfig();
const { app, close } = createApp({
    bodyLimit,
    responseDelayMs,
    publicDir: fileURLToPath(new URL('./public/', import.meta.url)),
});
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
