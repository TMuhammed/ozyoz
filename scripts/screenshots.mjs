// Produces 1280x800 store screenshots using the built extension in Chromium.
// Usage: npm run build && node scripts/screenshots.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dist = path.join(root, 'dist');
const outDir = path.join(root, 'store', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uzalif-shots-'));
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});
let [worker] = context.serviceWorkers();
worker ??= await context.waitForEvent('serviceworker');
const extensionId = new URL(worker.url()).hostname;

// 1. Demo page: text typed with the old spelling appears in the new alphabet.
const demo = await context.newPage();
await demo.goto('file://' + path.join(root, 'store', 'demo.html'));
await demo.waitForTimeout(400);
await demo.locator('#demo').click();
await demo.keyboard.type(
  "O'zbekiston Respublikasining davlat tili o'zbek tilidir. Toshkent shahri go'zal, ko'chalari chiroyli. Bog'da gullar ochildi.",
  { delay: 5 },
);
await demo.screenshot({ path: path.join(outDir, '1-typing.png') });

// 2. Popup.
const popup = await context.newPage();
// The popup normally reads the active tab; in a standalone tab there is none, so show a sample site.
await popup.addInitScript(() => {
  chrome.tabs.query = async () => [{ url: 'https://kun.uz/news' }];
});
await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
await popup.waitForTimeout(300);
await popup.evaluate(() => {
  document.documentElement.style.background = '#e5e7eb';
  document.body.style.margin = '120px auto';
  document.body.style.boxShadow = '0 20px 60px rgba(0,0,0,.25)';
  document.body.style.borderRadius = '12px';
  document.body.style.overflow = 'hidden';
});
await popup.screenshot({ path: path.join(outDir, '2-popup.png') });

// 3. Options page.
const options = await context.newPage();
await options.goto(`chrome-extension://${extensionId}/src/options/index.html`);
await options.waitForTimeout(300);
await options.screenshot({ path: path.join(outDir, '3-settings.png') });

await context.close();
fs.rmSync(userDataDir, { recursive: true, force: true });
console.log('screenshots written to', path.relative(root, outDir));
