// Builds a Chrome Web Store / Edge Add-ons upload zip from dist/.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dist = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
const out = path.join(root, 'release');
fs.mkdirSync(out, { recursive: true });
const zip = path.join(out, `ozyoz-${manifest.version}.zip`);
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-X', '-q', zip, '.'], { cwd: dist, stdio: 'inherit' });
const size = (fs.statSync(zip).size / 1024).toFixed(1);
console.log(`${path.relative(root, zip)} (${size} KB) — manifest v${manifest.version}`);
