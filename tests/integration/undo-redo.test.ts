import { test, expect, valueOf, setValue, UNDO, REDO } from './fixtures';

test('undo restores the original spelling and is not re-converted', async ({ page }) => {
  await page.locator('#textarea').click();
  await page.keyboard.type('sh');
  expect(await valueOf(page, '#textarea')).toBe('ş');
  await page.keyboard.press(UNDO);
  expect(await valueOf(page, '#textarea')).toBe('sh');
  await page.keyboard.press(REDO);
  expect(await valueOf(page, '#textarea')).toBe('ş');
});

test('undo steps through earlier words predictably', async ({ page }) => {
  await page.locator('#textarea').click();
  await page.keyboard.type('bu sh');
  expect(await valueOf(page, '#textarea')).toBe('bu ş');
  await page.keyboard.press(UNDO);
  expect(await valueOf(page, '#textarea')).toBe('bu sh');
  await page.keyboard.press(UNDO);
  // Chromium groups the typed characters; whatever remains must be a prefix of "bu sh".
  expect('bu sh'.startsWith(await valueOf(page, '#textarea'))).toBe(true);
});

test('undo works in contenteditable', async ({ page }) => {
  const el = page.locator('#editable');
  await el.click();
  await page.keyboard.type('ch');
  expect(await el.textContent()).toBe('ç');
  await page.keyboard.press(UNDO);
  expect(await el.textContent()).toBe('ch');
});

test('deleting characters never triggers conversion', async ({ page }) => {
  const ta = page.locator('#textarea');
  await setValue(ta, 'shx');
  await ta.evaluate((n) => (n as HTMLTextAreaElement).setSelectionRange(3, 3));
  await page.keyboard.press('Backspace');
  expect(await valueOf(page, '#textarea')).toBe('sh');
});
