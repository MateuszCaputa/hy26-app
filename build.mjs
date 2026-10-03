// Buduje proces główny, preload i interfejs (esbuild) oraz kopiuje pliki statyczne.
import * as esbuild from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { watch as fsWatch } from 'node:fs';

const watch = process.argv.includes('--watch');
const prod = process.argv.includes('--prod');

await rm('dist', { recursive: true, force: true });
await mkdir('dist/renderer', { recursive: true });

const common = { bundle: true, sourcemap: !prod, minify: prod, logLevel: 'info' };

const configs = [
  {
    ...common,
    entryPoints: ['src/main/main.ts'],
    outfile: 'dist/main/main.js',
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron', 'uiohook-napi', 'node:sqlite'],
  },
  {
    ...common,
    entryPoints: ['src/preload.ts'],
    outfile: 'dist/preload.js',
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron'],
  },
  {
    ...common,
    entryPoints: { app: 'src/renderer/app.ts', widget: 'src/renderer/widget.ts', nudge: 'src/renderer/nudge.ts' },
    outdir: 'dist/renderer',
    platform: 'browser',
    format: 'esm',
    target: 'chrome130',
  },
];

async function copyStatic() {
  await cp('src/renderer/static', 'dist/renderer', { recursive: true });
  await cp('node_modules/@mediapipe/tasks-vision/wasm', 'dist/renderer/wasm', { recursive: true });
}

await copyStatic();
if (watch) {
  for (const c of configs) await (await esbuild.context(c)).watch();
  // HTML/CSS też: kopiujemy ponownie przy każdej zmianie w src/renderer/static.
  let t = null;
  fsWatch('src/renderer/static', { recursive: true }, () => {
    clearTimeout(t);
    t = setTimeout(() => cp('src/renderer/static', 'dist/renderer', { recursive: true }).then(() => console.log('[watch] static copied')), 150);
  });
  console.log('Obserwuję zmiany… (TS przez esbuild, HTML/CSS kopiowane przy zmianie)');
} else {
  await Promise.all(configs.map((c) => esbuild.build(c)));
}
