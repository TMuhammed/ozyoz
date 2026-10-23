import { test, expect, readSettings } from './fixtures';

test('popup toggles the global switch and shows the ruleset version', async ({ context, extensionId, worker }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await expect(popup.getByText('O‘RQ-1184')).toBeVisible();
  const toggle = popup.getByLabel('Avtomatik ötkazişni yoqiş');
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  const stored = await readSettings(worker);
  expect(stored.enabled).toBe(false);
  await popup.getByRole('button', { name: '15 daqiqa pauza' }).click();
  const paused = await readSettings(worker);
  expect(paused.pausedUntil).toBeGreaterThan(Date.now());
  await popup.close();
});

test('options page adds and removes a disabled site and restores defaults', async ({ context, extensionId, worker }) => {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  await options.getByLabel('Sayt manzili').fill('https://Mail.Google.com/inbox');
  await options.getByRole('button', { name: 'Qöşiş' }).click();
  await expect(options.getByText('mail.google.com')).toBeVisible();
  let stored = await readSettings(worker);
  expect(stored.disabledSites).toEqual(['mail.google.com']);
  await options.getByRole('button', { name: 'mail.google.com ni röyxatdan olib taşlaş' }).click();
  await expect(options.getByText('mail.google.com')).toHaveCount(0);
  await options.getByLabel('Söz tugagaç').check();
  await options.getByRole('button', { name: 'Standart sozlamalarni tiklaş' }).click();
  stored = await readSettings(worker);
  expect(stored.ambiguousMode).toBe('immediate');
  await options.close();
});
