import { useEffect, useState, type FormEvent } from 'react';
import { RULESET } from '@/core';
import { DEFAULT_SETTINGS, siteKey, type AmbiguousMode, type Settings } from '@/shared/settings';
import { loadSettings, onSettingsChanged, saveSettings, updateSettings } from '@/shared/storage';

export function Options() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [newSite, setNewSite] = useState('');

  useEffect(() => {
    void loadSettings().then(setS);
    return onSettingsChanged(setS);
  }, []);

  const patch = (p: Partial<Settings>) => {
    setS((prev) => ({ ...prev, ...p }));
    void updateSettings(p);
  };
  const reset = () => {
    setS({ ...DEFAULT_SETTINGS });
    void saveSettings({ ...DEFAULT_SETTINGS });
  };

  const addSite = (e: FormEvent) => {
    e.preventDefault();
    let host = newSite.trim();
    if (!host) return;
    try {
      if (host.includes('/') || host.includes(':')) host = new URL(host.includes('://') ? host : `https://${host}`).hostname;
    } catch {
      /* keep raw */
    }
    const key = siteKey(host);
    if (!s.disabledSites.includes(key)) patch({ disabledSites: [...s.disabledSites, key] });
    setNewSite('');
  };

  return (
    <div className="page">
      <h1>UzAlif — Sozlamalar</h1>

      <section className="card">
        <h2>Oʻtkazish</h2>
        <div className="field">
          <input id="enabled" type="checkbox" checked={s.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
          <label htmlFor="enabled">Avtomatik oʻtkazish yoqilgan<small>Yozayotganingizda sh→ş, ch→ç, oʻ→ö, gʻ→ğ.</small></label>
        </div>
        <div className="field">
          <input id="paste" type="checkbox" checked={s.convertPaste} onChange={(e) => patch({ convertPaste: e.target.checked })} />
          <label htmlFor="paste">Qoʻyilgan (paste) matnni ham oʻtkazish<small>Faqat oddiy matn; URL va e-mail manzillar oʻzgarmaydi.</small></label>
        </div>
        <div className="field">
          <input id="apos" type="checkbox" checked={s.normalizeApostrophes} onChange={(e) => patch({ normalizeApostrophes: e.target.checked })} />
          <label htmlFor="apos">Tutuq belgisini toʻgʻrilash (ʼ, U+02BC)<small>maʼno, sanʼat kabi soʻzlardagi apostrofni rasmiy belgiga almashtiradi. Inglizcha matn yozsangiz (don't) oʻchirib qoʻying.</small></label>
        </div>
      </section>

      <section className="card">
        <h2>Qachon oʻtkazish</h2>
        {(
          [
            ['immediate', 'Darhol', 'sh yozilishi bilan ş ga aylanadi. Tavsiya etiladi.'],
            ['wordBoundary', 'Soʻz tugagach', 'Boʻsh joy yoki tinish belgisi qoʻyilgandan keyin butun soʻz oʻtkaziladi.'],
          ] as [AmbiguousMode, string, string][]
        ).map(([value, label, hint]) => (
          <div className="field" key={value}>
            <input id={`mode-${value}`} type="radio" name="mode" checked={s.ambiguousMode === value} onChange={() => patch({ ambiguousMode: value })} />
            <label htmlFor={`mode-${value}`}>{label}<small>{hint}</small></label>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Oʻchirilgan saytlar</h2>
        <div className="sites">
          {s.disabledSites.length === 0 && <span className="muted">Roʻyxat boʻsh. Popup orqali yoki quyida sayt qoʻshing.</span>}
          {s.disabledSites.map((d) => (
            <div className="site" key={d}>
              <span>{d}</span>
              <button type="button" onClick={() => patch({ disabledSites: s.disabledSites.filter((x) => x !== d) })} aria-label={`${d} ni roʻyxatdan olib tashlash`}>
                Olib tashlash
              </button>
            </div>
          ))}
        </div>
        <form className="add" onSubmit={addSite}>
          <input value={newSite} onChange={(e) => setNewSite(e.target.value)} placeholder="masalan, mail.google.com" aria-label="Sayt manzili" />
          <button type="submit">Qoʻshish</button>
        </form>
      </section>

      <section className="card">
        <h2>Alifbo</h2>
        <table>
          <tbody>
            <tr><td>Qonun</td><td>{RULESET.source.number}, {RULESET.source.signedOn}</td></tr>
            <tr><td>Kuchga kiradi</td><td>{RULESET.source.effectiveOn}</td></tr>
            <tr><td>Qoidalar versiyasi</td><td>{RULESET.version}</td></tr>
            <tr><td>Manba</td><td><a href={RULESET.source.url} target="_blank" rel="noreferrer">{RULESET.source.url}</a></td></tr>
            <tr><td>Harflar</td><td>{RULESET.alphabet.join(' ')} ʼ</td></tr>
          </tbody>
        </table>
        <span className="muted">Yozilgan matn hech qayerga yuborilmaydi; barcha ishlov brauzer ichida.</span>
      </section>

      <section className="card">
        <h2>Tiklash</h2>
        <div>
          <button type="button" className="danger" onClick={reset}>Standart sozlamalarni tiklash</button>
        </div>
      </section>
    </div>
  );
}
