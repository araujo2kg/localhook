import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { build, context } from 'esbuild';

const IS_WATCH_MODE = process.argv.includes('--watch');

await mkdir('dist/public', { recursive: true });
await copyFile('client/index.html', 'dist/public/index.html');
const FRONTEND_BUILD_OPTIONS = {
    entryPoints: ['client/main.tsx'],
    bundle: true,
    outfile: 'dist/public/app.js',
    minify: !IS_WATCH_MODE,
    sourcemap: IS_WATCH_MODE,
    target: 'es2022',
    define: {
        'process.env.NODE_ENV': JSON.stringify(IS_WATCH_MODE ? 'development' : 'production'),
    },
    plugins: [
        {
            name: 'html',
            setup(builder) {
                builder.onLoad({ filter: /main\.tsx$/ }, async (args) => ({
                    contents: await readFile(args.path, 'utf8'),
                    loader: 'tsx',
                    resolveDir: resolve('client'),
                    watchFiles: [resolve('client/index.html')],
                }));

                builder.onEnd(async () => {
                    await copyFile('client/index.html', 'dist/public/index.html');
                });
            },
        },
    ],
};
const BACKEND_BUILD_OPTIONS = {
    entryPoints: ['server/index.ts'],
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
    outfile: 'dist/server.js',
    sourcemap: IS_WATCH_MODE,
    target: 'node22',
};

if (IS_WATCH_MODE) {
    const contexts = await Promise.all([
        context(FRONTEND_BUILD_OPTIONS),
        context(BACKEND_BUILD_OPTIONS),
    ]);

    await Promise.all(contexts.map((builder) => builder.rebuild()));
    await Promise.all(contexts.map((builder) => builder.watch()));
    const child = spawn(process.execPath, ['--watch', 'dist/server.js'], { stdio: 'inherit' });
    /** @type {Promise<void> | undefined} */
    let disposal;

    function dispose() {
        disposal ??= Promise.all(contexts.map((builder) => builder.dispose())).then(
            () => undefined,
        );

        return disposal;
    }

    function reportCleanupFailure(error) {
        console.error('Unable to stop the development build:', error);
        process.exitCode = 1;
    }

    function handleStop() {
        child.kill();
        void dispose().catch(reportCleanupFailure);
    }

    function removeSignalHandlers() {
        process.off('SIGINT', handleStop);
        process.off('SIGTERM', handleStop);
    }

    process.once('SIGINT', handleStop);
    process.once('SIGTERM', handleStop);
    child.once('error', (error) => {
        removeSignalHandlers();
        console.error('Unable to start the development server:', error);
        process.exitCode = 1;
        void dispose().catch(reportCleanupFailure);
    });

    child.once('exit', (code) => {
        removeSignalHandlers();
        process.exitCode ??= code ?? 0;
        void dispose().catch(reportCleanupFailure);
    });
} else {
    await Promise.all([build(FRONTEND_BUILD_OPTIONS), build(BACKEND_BUILD_OPTIONS)]);
}
