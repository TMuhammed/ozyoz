# Store listing — Özyoz 0.1.0

Use the same package for all three stores. Build it with:

```bash
npm run package      # → release/ozyoz-0.1.0.zip
node scripts/screenshots.mjs   # → store/screenshots/*.png (1280×800)
```

## Where to publish

| Browser | Store | Account | Notes |
|---|---|---|---|
| Chrome | Chrome Web Store, https://chrome.google.com/webstore/devconsole | Google account, one-time $5 registration | Review usually 1–3 days for new items with `<all_urls>` |
| Yandex Browser | Chrome Web Store (Yandex installs Chrome extensions directly) | same | No separate submission needed |
| Microsoft Edge | Partner Center, https://partner.microsoft.com/dashboard/microsoftedge | Microsoft account, free | Upload the same zip; review up to 7 days |

## Listing text

**Name:** Özyoz — yangi özbek alifbosi

**Short description (≤132 chars, matches manifest):**
Yozganingizda yangi özbek lotin alifbosiga ötkazadi: sh→ş, ch→ç, oʻ→ö, gʻ→ğ. Hammasi lokal, heç narsa yuborilmaydi.

**Detailed description (uz):**

Özyoz — eski usulda yozasiz, yangi alifboda çiqadi.

2026-yil 21-oktabrda imzolangan O‘RQ-1184-son Qonun bilan özbek lotin alifbosi yangilandi: Sh → Ş, Ch → Ç, Oʻ → Ö, Gʻ → Ğ. Özyoz brauzerdagi istalgan matn maydonida (izohlar, xatlar, çatlar, formalar) yozayotganingizda harflarni avtomatik almaştiradi. Odatdagidek yozişda davom etasiz.

Imkoniyatlar:
• Yoziş paytida avtomatik ötkaziş — faqat hozir yozilayotgan söz özgaradi
• Ctrl+Z eski yozuvni qaytaradi
• Qöyilgan (paste) matnni ham ötkazadi; URL va e-mail manzillarga tegmaydi
• Bir tugma bilan öçiriş, 15 daqiqa / 1 soatga pauza, saytlar böyiça öçiriş
• Parol, karta va boşqa maxfiy maydonlar heç qaçon özgartirilmaydi
• Manzil qatorida «uz» yozib, söng matn yozing — yangi alifbodagi söröv bilan qidiradi
• Heç narsa serverga yuborilmaydi — barça işlov brauzer içida

Yangi alifbo 2027-yil 22-apreldan kuçga kiradi. Qoidalar rasmiy matn asosida tuzilgan: https://lex.uz/uz/docs/8548754

Kalit soʻzlar (qidiruv uchun): o'zbek alifbosi, yangi alifbo, lotin alifbosi, konvertor, Ö Ğ Ş Ç, oʻzbek tili.

**Detailed description (ru):**

Özyoz — пишете по-старому, получаете новый алфавит.

Законом O‘RQ-1184 от 21 октября 2026 года обновлён узбекский латинский алфавит: Sh → Ş, Ch → Ç, Oʻ → Ö, Gʻ → Ğ. Özyoz автоматически заменяет буквы, пока вы печатаете в любом текстовом поле браузера. Печатать можно как привыкли.

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
- Privacy policy URL: https://github.com/TMuhammed/ozyoz/blob/main/PRIVACY.md
- Homepage / support URL: https://github.com/TMuhammed/ozyoz

## Assets

| Asset | Requirement | Where |
|---|---|---|
| Icon | 128×128 PNG | `src/assets/icons/icon128.png` |
| Screenshots | 1280×800 PNG, 1–5 | `store/screenshots/` (generated) |
| Small promo tile (optional) | 440×280 | not made yet |

## Pre-submission checklist

- [ ] `npm run test:all` passes
- [ ] Tested manually in Chrome, Edge and Yandex Browser on: Gmail, Telegram Web, Facebook, a Google Form, a site with React inputs
- [ ] `PRIVACY.md` public at https://github.com/TMuhammed/ozyoz/blob/main/PRIVACY.md (after the first push)
- [ ] Version in `manifest.json` bumped for every new upload
- [ ] Zip uploaded from `release/`
