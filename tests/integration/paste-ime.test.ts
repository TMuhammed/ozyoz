import { test, expect, valueOf, pastePlain } from './fixtures';

test('plain-text paste into textarea is converted (URLs kept)', async ({ page }) => {
  await pastePlain(page, '#textarea', "O'zbek shahri https://sh.uz/ch ma'no");
  expect(await valueOf(page, '#textarea')).toBe("Özbek şahri https://sh.uz/ch ma'no");
});

test('paste into contenteditable with text/plain only is converted', async ({ page }) => {
  await pastePlain(page, '#editable', "chiroyli bog'");
  expect(await page.locator('#editable').textContent()).toBe('çiroyli boğ');
});

test('paste can be disabled in settings', async ({ page, setSettings }) => {
  await setSettings({ convertPaste: false });
  await pastePlain(page, '#textarea', 'shahar');
  // Synthetic paste has no default action, so nothing is inserted when we do not handle it.
  expect(await valueOf(page, '#textarea')).toBe('');
});

test('no conversion during IME composition, conversion resumes after', async ({ page }) => {
  const ta = page.locator('#textarea');
  await ta.click();
  await ta.evaluate((n) => n.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, composed: true })));
  await page.keyboard.type('sh');
  expect(await valueOf(page, '#textarea')).toBe('sh');
  await ta.evaluate((n) => n.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, composed: true })));
  await page.keyboard.type(' ch');
  expect(await valueOf(page, '#textarea')).toBe('sh ç');
});
