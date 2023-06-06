// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const esbuild = require('esbuild');

esbuild.buildSync({
    entryPoints: [
        { out: 'extension.bundle', in: 'src/extension.ts' },
        { out: 'dockerfile-language-server-nodejs/lib/server', in: 'node_modules/dockerfile-language-server-nodejs/lib/server.js' },
        { out: 'compose-language-service/lib/server', in: 'node_modules/@microsoft/compose-language-service/lib/server.js' },
    ],
    platform: 'node',
    bundle: true,
    sourcemap: true,
    target: 'es2020',
    mainFields: ['main'],
    external: ['vscode'],
    format: 'cjs',
    outdir: 'dist',
});
