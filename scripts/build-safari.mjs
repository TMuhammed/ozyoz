// Builds the Safari Web Extension variant into dist-safari/.
// Differences from the Chromium build (dist/):
//  - no omnibox keyword and no "search" permission (unsupported in Safari)
//  - background.scripts instead of background.service_worker
//  - content script and background bundled as single IIFE files (no loader /
//    dynamic import), which is the safest shape for WebKit content scripts
import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = path.join(root, 'dist-safari');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const alias = { '@': path.join(root, 'src') };

// 1. Popup and options pages (multi-page Vite build).
await viteBuild({
  root,
  configFile: false,
  logLevel: 'warn',
  plugins: [react()],
  resolve: { alias },
  build: {
    outDir: out,
    emptyOutDir: false,
    target: 'safari16',
    rollupOptions: {
      input: {
        popup: path.join(root, 'src/popup/index.html'),
        options: path.join(root, 'src/options/index.html'),
      },
    },
  },
});

// 2. Content script and background as IIFE bundles.
for (const [name, entry] of [
  ['content-script', 'src/browser/content-script.ts'],
  ['background', 'src/browser/background.ts'],
]) {
  await esbuild({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    format: 'iife',
    target: ['safari16'],
    outfile: path.join(out, `${name}.js`),
    alias,
    minify: true,
    legalComments: 'none',
    define: { 'import.meta.env.TARGET': '"safari"' },
  });
}

// 3. Icons.
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  fs.copyFileSync(path.join(root, `src/assets/icons/icon${size}.png`), path.join(out, `icons/icon${size}.png`));
}

// 4. Manifest derived from the Chromium one.
const base = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const manifest = {
  manifest_version: 3,
  name: base.name,
  version: base.version,
  description: base.description,
  icons: Object.fromEntries([16, 32, 48, 128].map((s) => [String(s), `icons/icon${s}.png`])),
  action: { default_popup: 'src/popup/index.html', default_title: base.name, default_icon: { 16: 'icons/icon16.png', 32: 'icons/icon32.png' } },
  options_page: 'src/options/index.html',
  background: { scripts: ['background.js'] },
  permissions: ['storage', 'activeTab'],
  content_scripts: [
    { matches: ['<all_urls>'], js: ['content-script.js'], run_at: 'document_idle', all_frames: true },
  ],
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('dist-safari/ built:', fs.readdirSync(out).join(', '));
