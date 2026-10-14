import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { loadConfig } from './config';
import { API_ROUTES, LOOPBACK_HOST } from '../shared/constants';

const { port, bodyLimit } = loadConfig();
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
