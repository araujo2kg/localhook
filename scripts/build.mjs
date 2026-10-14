import { build, context } from 'esbuild';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const watch = process.argv.includes('--watch');
await mkdir('dist/public', { recursive: true });
await copyFile('client/index.html', 'dist/public/index.html');
const frontend = {
    entryPoints: ['client/main.tsx'],
    bundle: true,
    outfile: 'dist/public/app.js',
    minify: !watch,
    sourcemap: watch,
    target: 'es2022',
    define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
    plugins: [
        {
            name: 'html',
            setup(builder) {
                builder.onLoad({ filter: /main\.tsx$/ }, async (args) => ({ contents: await readFile(args.path, 'utf8'), loader: 'tsx', resolveDir: resolve('client'), watchFiles: [resolve('client/index.html')] }));
                builder.onEnd(async () => {
                    await copyFile('client/index.html', 'dist/public/index.html');
                });
            },
        },
    ],
};
const backend = { entryPoints: ['server/index.ts'], bundle: true, packages: 'external', platform: 'node', format: 'esm', outfile: 'dist/server.js', sourcemap: watch, target: 'node22' };

if (watch) {
    const contexts = await Promise.all([context(frontend), context(backend)]);
    await Promise.all(contexts.map((builder) => builder.rebuild()));
    await Promise.all(contexts.map((builder) => builder.watch()));
    const child = spawn(process.execPath, ['--watch', 'dist/server.js'], { stdio: 'inherit' });
    const stop = async () => {
        child.kill();
        await Promise.all(contexts.map((builder) => builder.dispose()));
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    child.once('exit', async (code) => {
        await Promise.all(contexts.map((builder) => builder.dispose()));
        process.exitCode = code ?? 0;
    });
} else {
    await Promise.all([build(frontend), build(backend)]);
}
