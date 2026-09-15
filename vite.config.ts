import { defineConfig } from 'vite';
import { zipSync } from 'fflate';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };
const archiveName = 'quilt-electron-starter-' + version + '.zip';
const archivePath = '/downloads/' + archiveName;
const starterFiles = [
  'README.md',
  'index.html',
  'main.cjs',
  'main.ts',
  'package.json',
  'style.css',
  'tsconfig.json',
  'vite.config.ts',
];
const archive = zipSync(
  Object.fromEntries([
    ...starterFiles.map((name) => [
      'quilt-electron-starter/' + name,
      readFileSync(new URL('./examples/electron/' + name, import.meta.url)),
    ]),
    ['quilt-electron-starter/LICENSE', readFileSync(new URL('./LICENSE', import.meta.url))],
  ]),
  { level: 0, mtime: new Date('2026-01-01T00:00:00Z') },
);
export default defineConfig({
  plugins: [
    {
      name: 'quilt-site-version',
      transformIndexHtml: (html) => html.replaceAll('__QUILT_VERSION__', version),
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: archivePath.slice(1), source: archive });
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split('?')[0] !== archivePath) return next();
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', 'attachment; filename="' + archiveName + '"');
          res.end(Buffer.from(archive));
        });
      },
    },
  ],
  server: { host: 'localhost', port: 5186, strictPort: true },
  build: {
    rolldownOptions: {
      input: {
        index: resolve('index.html'),
        vanilla: resolve('vanilla.html'),
        react: resolve('react.html'),
        electron: resolve('electron.html'),
      },
    },
  },
});
