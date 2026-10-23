import { test as base, chromium, type BrowserContext, type Locator, type Page, type Worker } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Settings } from '../../src/shared/settings';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const DIST = path.join(ROOT, 'dist');
const PAGES = path.join(ROOT, 'tests/integration/pages');

export const UNDO = process.platform === 'darwin' ? 'Meta+z' : 'Control+z';
export const REDO = process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+y';

function startServer(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const file = path.join(PAGES, (req.url ?? '/').split('?')[0]!.replace(/^\/$/, '/fields.html'));
    if (!file.startsWith(PAGES) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

type Fixtures = {
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  baseURL: string;
  page: Page;
  setSettings: (patch: Partial<Settings>) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    if (!fs.existsSync(path.join(DIST, 'manifest.json'))) {
      throw new Error('dist/manifest.json missing: run `npm run build` before integration tests');
    }
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uzalif-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
    });
    await use(context);
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  },
  worker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).hostname);
  },
  // eslint-disable-next-line no-empty-pattern
  baseURL: async ({}, use) => {
    const server = await startServer();
    const { port } = server.address() as AddressInfo;
    await use(`http://127.0.0.1:${port}`);
    await new Promise((r) => server.close(r));
  },
  setSettings: async ({ worker }, use) => {
    await use(async (patch) => {
      await worker.evaluate(async (p) => {
        const { settings } = await chrome.storage.local.get('settings');
        await chrome.storage.local.set({ settings: { ...(settings ?? {}), ...p } });
      }, patch);
      // Let storage.onChanged reach the content script.
      await new Promise((r) => setTimeout(r, 100));
    });
  },
  page: async ({ context, baseURL }, use) => {
    const page = await context.newPage();
    await page.goto(`${baseURL}/fields.html`);
    await page.waitForTimeout(300); // content script loads settings asynchronously
    await use(page);
    await page.close();
  },
});

export const expect = test.expect;

export async function typeInto(page: Page, selector: string, text: string): Promise<string> {
  const el = page.locator(selector);
  await el.click();
  await page.keyboard.type(text);
  return valueOf(page, selector);
}

export function valueOf(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((n) => {
    const el = n as HTMLInputElement;
    return typeof el.value === 'string' ? el.value : (n.textContent ?? '');
  });
}

export function caretOf(page: Page, selector: string): Promise<[number, number]> {
  return page.locator(selector).evaluate((n) => {
    const el = n as HTMLInputElement;
    return [el.selectionStart ?? -1, el.selectionEnd ?? -1];
  });
}

/** Dispatches a synthetic paste carrying only text/plain. */
export async function pastePlain(page: Page, selector: string, text: string): Promise<void> {
  await page.locator(selector).click();
  await page.locator(selector).evaluate((n, t) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    n.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true, composed: true }));
  }, text);
}

/** Sets a field value directly, without the input event that fill() dispatches. */
export async function setValue(el: Locator, value: string): Promise<void> {
  await el.evaluate((n, v) => {
    const t = n as HTMLTextAreaElement;
    t.value = v;
    t.focus();
  }, value);
}

export function readSettings(worker: Worker): Promise<Settings> {
  return worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings as Settings);
}
