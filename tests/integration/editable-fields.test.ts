import { test, expect, typeInto, valueOf } from './fixtures';

test.describe('supported fields convert while typing', () => {
  for (const [sel, label] of [
    ['#text', 'input[type=text]'],
    ['#search', 'input[type=search]'],
    ['#untyped', 'input without type'],
    ['#textarea', 'textarea'],
  ] as const) {
    test(label, async ({ page }) => {
      expect(await typeInto(page, sel, "O'zbekiston shahri chiroyli, to'g'ri bog'")).toBe('Özbekiston şahri çiroyli, töğri boğ');
    });
  }

  test('textarea inside an open shadow root', async ({ page }) => {
    const ta = page.locator('#host').locator('#shadow-textarea');
    await ta.click();
    await page.keyboard.type("yaxshi ko'cha");
    expect(await ta.inputValue()).toBe('yaxşi köça');
  });

  test('contenteditable div', async ({ page }) => {
    expect(await typeInto(page, '#editable', "Toshkent shahri go'zal")).toBe('Toşkent şahri gözal');
  });

  test('contenteditable with existing rich content, typing at the end', async ({ page }) => {
    const el = page.locator('#editable-rich');
    await el.click();
    await page.keyboard.press('End');
    await page.keyboard.type(" shahar o'zbek");
    expect(await el.innerHTML()).toBe('<p>Salom <b>dunyo şahar özbek</b></p>');
  });

  test('framework-style listener sees the converted value', async ({ page }) => {
    await typeInto(page, '#react', 'shahar');
    expect(await page.locator('#react-mirror').textContent()).toBe('şahar');
  });

  test('incomplete sequences are left alone until completed', async ({ page }) => {
    await typeInto(page, '#text', 's');
    expect(await valueOf(page, '#text')).toBe('s');
    await page.keyboard.type('h');
    expect(await valueOf(page, '#text')).toBe('ş');
    await page.keyboard.type(' o');
    expect(await valueOf(page, '#text')).toBe('ş o');
    await page.keyboard.type("'");
    expect(await valueOf(page, '#text')).toBe('ş ö');
  });

  test("s'h stays two letters", async ({ page }) => {
    expect(await typeInto(page, '#text', "Is'hoq")).toBe("Is'hoq");
  });
});

test.describe('excluded fields are never modified', () => {
  for (const [sel, label] of [
    ['#password', 'password'],
    ['#email', 'email'],
    ['#card', 'name contains card'],
    ['#cc', 'autocomplete cc-number'],
    ['#pin', 'inputmode numeric'],
    ['#optout', 'data-uzalif="off" ancestor'],
  ] as const) {
    test(label, async ({ page }) => {
      expect(await typeInto(page, sel, "shahar o'z")).toBe("shahar o'z");
    });
  }
});
