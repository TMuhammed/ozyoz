import { test, expect, typeInto, valueOf } from './fixtures';

test('global switch off stops conversion; on again without reload', async ({ page, setSettings }) => {
  await setSettings({ enabled: false });
  expect(await typeInto(page, '#text', 'sh ')).toBe('sh ');
  await setSettings({ enabled: true });
  await page.keyboard.type('ch');
  expect(await valueOf(page, '#text')).toBe('sh ç');
});

test('disabled site list matches the current hostname', async ({ page, setSettings }) => {
  await setSettings({ disabledSites: ['127.0.0.1'] });
  expect(await typeInto(page, '#text', 'sh')).toBe('sh');
  await setSettings({ disabledSites: ['example.com'] });
  await page.keyboard.type(' ch');
  expect(await valueOf(page, '#text')).toBe('sh ç');
});

test('pause stops conversion until it expires or is cleared', async ({ page, setSettings }) => {
  await setSettings({ pausedUntil: Date.now() + 60_000 });
  expect(await typeInto(page, '#text', 'sh')).toBe('sh');
  await setSettings({ pausedUntil: null });
  await page.keyboard.type(' ch');
  expect(await valueOf(page, '#text')).toBe('sh ç');
  await setSettings({ pausedUntil: Date.now() - 1 });
  await page.keyboard.type(' sh');
  expect(await valueOf(page, '#text')).toBe('sh ç ş');
});

test('wordBoundary mode converts once the word is finished', async ({ page, setSettings }) => {
  await setSettings({ ambiguousMode: 'wordBoundary' });
  expect(await typeInto(page, '#text', 'shahar')).toBe('shahar');
  await page.keyboard.type(' ');
  expect(await valueOf(page, '#text')).toBe('şahar ');
  await page.keyboard.type("bog'.");
  expect(await valueOf(page, '#text')).toBe('şahar boğ.');
});

test('normalizeApostrophes setting reaches the content script', async ({ page, setSettings }) => {
  await setSettings({ normalizeApostrophes: true });
  expect(await typeInto(page, '#text', "ma'no")).toBe('maʼno');
});
