# Store listing — UzAlif 0.1.0

Use the same package for all three stores. Build it with:

```bash
npm run package      # → release/uzalif-0.1.0.zip
node scripts/screenshots.mjs   # → store/screenshots/*.png (1280×800)
```

## Where to publish

| Browser | Store | Account | Notes |
|---|---|---|---|
| Chrome | Chrome Web Store, https://chrome.google.com/webstore/devconsole | Google account, one-time $5 registration | Review usually 1–3 days for new items with `<all_urls>` |
| Yandex Browser | Chrome Web Store (Yandex installs Chrome extensions directly) | same | No separate submission needed |
| Microsoft Edge | Partner Center, https://partner.microsoft.com/dashboard/microsoftedge | Microsoft account, free | Upload the same zip; review up to 7 days |

## Listing text

**Name:** UzAlif

**Short description (≤132 chars, matches manifest):**
Yozganingizda yangi oʻzbek lotin alifbosiga oʻtkazadi: sh→ş, ch→ç, oʻ→ö, gʻ→ğ. Hammasi lokal, hech narsa yuborilmaydi.

**Detailed description (uz):**

UzAlif — eski usulda yozasiz, yangi alifboda chiqadi.

2026-yil 21-oktabrda imzolangan O‘RQ-1184-son Qonun bilan oʻzbek lotin alifbosi yangilandi: Sh → Ş, Ch → Ç, Oʻ → Ö, Gʻ → Ğ. UzAlif brauzerdagi istalgan matn maydonida (izohlar, xatlar, chatlar, formalar) yozayotganingizda harflarni avtomatik almashtiradi. Odatdagidek yozishda davom etasiz.

Imkoniyatlar:
• Yozish paytida avtomatik oʻtkazish — faqat hozir yozilayotgan soʻz oʻzgaradi
• Ctrl+Z eski yozuvni qaytaradi
• Qoʻyilgan (paste) matnni ham oʻtkazadi; URL va e-mail manzillarga tegmaydi
• Bir tugma bilan oʻchirish, 15 daqiqa / 1 soatga pauza, saytlar boʻyicha oʻchirish
• Parol, karta va boshqa maxfiy maydonlar hech qachon oʻzgartirilmaydi
• Manzil qatorida «uz» yozib, soʻng matn yozing — yangi alifbodagi soʻrov bilan qidiradi
• Hech narsa serverga yuborilmaydi — barcha ishlov brauzer ichida

Yangi alifbo 2027-yil 22-apreldan kuchga kiradi. Qoidalar rasmiy matn asosida tuzilgan: https://lex.uz/uz/docs/8548754

**Detailed description (ru):**

UzAlif — пишете по-старому, получаете новый алфавит.

Законом O‘RQ-1184 от 21 октября 2026 года обновлён узбекский латинский алфавит: Sh → Ş, Ch → Ç, Oʻ → Ö, Gʻ → Ğ. UzAlif автоматически заменяет буквы, пока вы печатаете в любом текстовом поле браузера. Печатать можно как привыкли.

• Автоматическая конвертация при наборе, меняется только текущее слово
• Ctrl+Z возвращает старое написание
• Конвертация вставленного текста, URL и e-mail не трогаются
• Выключение одной кнопкой, пауза, отключение для отдельных сайтов
• Пароли и платёжные поля никогда не изменяются
• В адресной строке: «uz», пробел, текст — поиск уже в новом алфавите
• Ничего не отправляется на сервер

**Category:** Productivity (Chrome) / Productivity (Edge)
**Language:** Uzbek (primary), Russian

## Privacy section (Chrome Web Store "Privacy practices" tab)

- Single purpose: converts Uzbek Latin text to the 2026 alphabet while typing.
- Permission justifications:
  - `storage` — saves user settings locally.
  - `activeTab` — the popup shows which site the user is on and lets them disable it there.
  - `search` — the `uz` omnibox keyword searches the converted query with the default engine.
  - Host permission `<all_urls>` (content script) — conversion must run in text fields on any site the user types on; the script reads only the field being edited and sends nothing.
- Remote code: none.
- Data usage: no data collected. Tick "does not collect" for every category.
- Privacy policy URL: host `PRIVACY.md` publicly (e.g. GitHub repository or GitHub Pages) and paste the URL.

## Assets

| Asset | Requirement | Where |
|---|---|---|
| Icon | 128×128 PNG | `src/assets/icons/icon128.png` |
| Screenshots | 1280×800 PNG, 1–5 | `store/screenshots/` (generated) |
| Small promo tile (optional) | 440×280 | not made yet |

## Pre-submission checklist

- [ ] `npm run test:all` passes
- [ ] Tested manually in Chrome, Edge and Yandex Browser on: Gmail, Telegram Web, Facebook, a Google Form, a site with React inputs
- [ ] `PRIVACY.md` hosted at a public URL
- [ ] Version in `manifest.json` bumped for every new upload
- [ ] Zip uploaded from `release/`
