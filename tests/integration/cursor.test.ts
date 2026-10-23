import { test, expect, caretOf, valueOf, setValue } from './fixtures';

test('caret stays after the converted word when typing at the end', async ({ page }) => {
  await page.locator('#textarea').click();
  await page.keyboard.type('salom sh');
  expect(await valueOf(page, '#textarea')).toBe('salom ş');
  expect(await caretOf(page, '#textarea')).toEqual([7, 7]);
});

test('typing in the middle converts only the current word and keeps the tail', async ({ page }) => {
  const ta = page.locator('#textarea');
  await setValue(ta, 'salom  dunyo sh ch');
  // Put the caret between the two spaces.
  await ta.evaluate((n) => (n as HTMLTextAreaElement).setSelectionRange(6, 6));
  await page.keyboard.type("to'g'ri");
  expect(await valueOf(page, '#textarea')).toBe('salom töğri dunyo sh ch');
  expect(await caretOf(page, '#textarea')).toEqual([11, 11]);
});

test('existing text is not rewritten when conversion does not apply', async ({ page }) => {
  const ta = page.locator('#textarea');
  await setValue(ta, 'sh ch');
  await ta.evaluate((n) => (n as HTMLTextAreaElement).setSelectionRange(5, 5));
  await page.keyboard.type(' kitob');
  expect(await valueOf(page, '#textarea')).toBe('sh ch kitob');
});

test('typing over a selection replaces it and converts the result', async ({ page }) => {
  const ta = page.locator('#textarea');
  await setValue(ta, 'salom dunyo');
  await ta.evaluate((n) => (n as HTMLTextAreaElement).setSelectionRange(6, 11));
  await page.keyboard.type('sh');
  expect(await valueOf(page, '#textarea')).toBe('salom ş');
  expect(await caretOf(page, '#textarea')).toEqual([7, 7]);
});

test('contenteditable caret stays at the end of the converted word', async ({ page }) => {
  const el = page.locator('#editable');
  await el.click();
  await page.keyboard.type("o'zbek");
  await page.keyboard.type(' tili');
  expect(await el.textContent()).toBe('özbek tili');
});
