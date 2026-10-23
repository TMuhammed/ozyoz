import { useEffect, useState, type FormEvent } from 'react';
import { RULESET } from '@/core';
import { DEFAULT_SETTINGS, siteKey, type AmbiguousMode, type Settings } from '@/shared/settings';
import { loadSettings, onSettingsChanged, saveSettings, updateSettings } from '@/shared/storage';
import { Support } from './Support';

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
      <h1>Özyoz — Sozlamalar</h1>

      <section className="card">
        <h2>Ötkaziş</h2>
        <div className="field">
          <input id="enabled" type="checkbox" checked={s.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
          <label htmlFor="enabled">Avtomatik ötkaziş yoqilgan<small>Yozayotganingizda sh→ş, ch→ç, oʻ→ö, gʻ→ğ.</small></label>
        </div>
        <div className="field">
          <input id="paste" type="checkbox" checked={s.convertPaste} onChange={(e) => patch({ convertPaste: e.target.checked })} />
          <label htmlFor="paste">Qöyilgan (paste) matnni ham ötkaziş<small>Faqat oddiy matn; URL va e-mail manzillar özgarmaydi.</small></label>
        </div>
        <div className="field">
          <input id="apos" type="checkbox" checked={s.normalizeApostrophes} onChange={(e) => patch({ normalizeApostrophes: e.target.checked })} />
          <label htmlFor="apos">Tutuq belgisini töğrilaş (ʼ, U+02BC)<small>maʼno, sanʼat kabi sözlardagi apostrofni rasmiy belgiga almaştiradi. Ingliz tilida yozsangiz (don't) öçirib qöying.</small></label>
        </div>
      </section>

      <section className="card">
        <h2>Qaçon ötkaziş</h2>
        {(
          [
            ['immediate', 'Darhol', 'sh yozilişi bilan ş ga aylanadi. Tavsiya etiladi.'],
            ['wordBoundary', 'Söz tugagaç', 'Böş joy yoki tiniş belgisi qöyilgandan keyin butun söz ötkaziladi.'],
          ] as [AmbiguousMode, string, string][]
        ).map(([value, label, hint]) => (
          <div className="field" key={value}>
            <input id={`mode-${value}`} type="radio" name="mode" checked={s.ambiguousMode === value} onChange={() => patch({ ambiguousMode: value })} />
            <label htmlFor={`mode-${value}`}>{label}<small>{hint}</small></label>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Öçirilgan saytlar</h2>
        <div className="sites">
          {s.disabledSites.length === 0 && <span className="muted">Röyxat böş. Popup orqali yoki quyida sayt qöşing.</span>}
          {s.disabledSites.map((d) => (
            <div className="site" key={d}>
              <span>{d}</span>
              <button type="button" onClick={() => patch({ disabledSites: s.disabledSites.filter((x) => x !== d) })} aria-label={`${d} ni röyxatdan olib taşlaş`}>
                Olib taşlaş
              </button>
            </div>
          ))}
        </div>
        <form className="add" onSubmit={addSite}>
          <input value={newSite} onChange={(e) => setNewSite(e.target.value)} placeholder="masalan, mail.google.com" aria-label="Sayt manzili" />
          <button type="submit">Qöşiş</button>
        </form>
      </section>

      <section className="card">
        <h2>Alifbo</h2>
        <table>
          <tbody>
            <tr><td>Qonun</td><td>{RULESET.source.number}, {RULESET.source.signedOn}</td></tr>
            <tr><td>Kuçga kiradi</td><td>{RULESET.source.effectiveOn}</td></tr>
            <tr><td>Qoidalar versiyasi</td><td>{RULESET.version}</td></tr>
            <tr><td>Manba</td><td><a href={RULESET.source.url} target="_blank" rel="noreferrer">{RULESET.source.url}</a></td></tr>
            <tr><td>Harflar</td><td>{RULESET.alphabet.join(' ')} ʼ</td></tr>
          </tbody>
        </table>
        <span className="muted">Yozilgan matn heç qayerga yuborilmaydi; barcha işlov brauzer içida.</span>
      </section>

      <Support />

      <section className="card">
        <h2>Tiklaş</h2>
        <div>
          <button type="button" className="danger" onClick={reset}>Standart sozlamalarni tiklaş</button>
        </div>
      </section>
    </div>
  );
}
