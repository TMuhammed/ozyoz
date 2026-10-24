import { useEffect, useState, type FormEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';

interface Settings {
  enabled: boolean;
  mode: 'immediate' | 'wordBoundary';
  normalizeApostrophes: boolean;
  excludedApps: string[];
  launchAtLogin: boolean;
  firstRunDone: boolean;
}
interface Status {
  enabled: boolean;
  pausedSecondsLeft: number | null;
  permission: 'granted' | 'denied' | 'notRequired';
  platform: string;
  currentApp: string | null;
  convertedWords: number;
  rulesVersion: string;
  lawNumber: string;
  effectiveOn: string;
  lawUrl: string;
}

const PLACEHOLDER = { macos: 'masalan, Telegram.app', windows: 'masalan, notepad.exe', linux: 'masalan, gnome-terminal' } as Record<string, string>;

export function App() {
  const [s, setS] = useState<Settings | null>(null);
  const [st, setSt] = useState<Status | null>(null);
  const [newApp, setNewApp] = useState('');
  const [sample, setSample] = useState("O'zbekiston shahri chiroyli, to'g'ri bog'.");
  const [preview, setPreview] = useState('');

  const refresh = () => void invoke<Status>('get_status').then(setSt);

  useEffect(() => {
    void invoke<Settings>('get_settings').then(setS);
    refresh();
    const t = setInterval(refresh, 2000);
    const un = listen<Settings>('settings-changed', (e) => setS(e.payload));
    return () => {
      clearInterval(t);
      void un.then((f) => f());
    };
  }, []);

  useEffect(() => {
    void invoke<string>('convert_preview', { text: sample }).then(setPreview);
  }, [sample, s?.normalizeApostrophes]);

  if (!s || !st) return <div className="page">…</div>;

  const save = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    void invoke<Settings>('set_settings', { settings: next }).then(setS).then(refresh);
  };

  const addApp = (e: FormEvent) => {
    e.preventDefault();
    const v = newApp.trim();
    if (v && !s.excludedApps.includes(v)) save({ excludedApps: [...s.excludedApps, v] });
    setNewApp('');
  };

  const active = s.enabled && !st.pausedSecondsLeft && st.permission !== 'denied';
  const statusText = st.permission === 'denied'
    ? 'Ruxsat yöq'
    : !s.enabled
      ? 'Öçirilgan'
      : st.pausedSecondsLeft
        ? `Pauza: ${Math.max(1, Math.ceil(st.pausedSecondsLeft / 60))} daqiqa`
        : 'Faol';

  return (
    <div className="page">
      <header className="header">
        <div className="logo" aria-hidden="true">ö</div>
        <div>
          <div className="title">Özyoz</div>
          <div className="subtitle">sh→ş · ch→ç · oʻ→ö · gʻ→ğ · barça dasturlarda</div>
        </div>
        <div className="status"><span className={`dot${active ? ' on' : ''}`} />{statusText}</div>
      </header>

      {st.permission === 'denied' && (
        <div className="warn">
          {st.platform === 'macos' ? (
            <>
              <strong>Özyoz klaviaturani kuzatiş uçun ruxsat söraydi.</strong>
              <span>System Settings → Privacy &amp; Security → <b>Accessibility</b> bölimida Özyoz ni yoqing. Ruxsat berilgaç dasturni qayta işga tuşiring.</span>
              <div className="row">
                <button className="primary" onClick={() => void invoke('request_permission').then(refresh)}>Ruxsat söraş</button>
                <button onClick={refresh}>Tekşiriş</button>
              </div>
            </>
          ) : (
            <>
              <strong>Bu seans qöllab-quvvatlanmaydi.</strong>
              <span>Linuxda Özyoz faqat X11 seansida işlaydi (Wayland emas). Kiriş oynasida X11 ni tanlang.</span>
            </>
          )}
        </div>
      )}

      <section className="card">
        <h2>Ötkaziş</h2>
        <div className="field">
          <input id="enabled" type="checkbox" checked={s.enabled} onChange={(e) => save({ enabled: e.target.checked })} />
          <label htmlFor="enabled">Avtomatik ötkaziş yoqilgan<small>Istalgan dasturda yozayotganingizda harflar almaştiriladi.</small></label>
        </div>
        <div className="field">
          <input id="apos" type="checkbox" checked={s.normalizeApostrophes} onChange={(e) => save({ normalizeApostrophes: e.target.checked })} />
          <label htmlFor="apos">Tutuq belgisini töğrilaş (ʼ)<small>maʼno, sanʼat kabi sözlarda. Ingliz tilida köp yozsangiz öçirib qöying.</small></label>
        </div>
        <div className="field">
          <input id="login" type="checkbox" checked={s.launchAtLogin} onChange={(e) => save({ launchAtLogin: e.target.checked })} />
          <label htmlFor="login">Tizimga kirganda işga tuşiriş</label>
        </div>
        <div className="row">
          {st.pausedSecondsLeft ? (
            <button onClick={() => void invoke('resume').then(refresh)}>Davom ettiriş</button>
          ) : (
            <>
              <button onClick={() => void invoke('pause', { minutes: 15 }).then(refresh)}>15 daqiqa pauza</button>
              <button onClick={() => void invoke('pause', { minutes: 60 }).then(refresh)}>1 soat pauza</button>
            </>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Qaçon ötkaziş</h2>
        {([
          ['immediate', 'Darhol', 'sh yozilişi bilan ş ga aylanadi. Tavsiya etiladi.'],
          ['wordBoundary', 'Söz tugagaç', 'Böş joy yoki tiniş belgisidan keyin butun söz ötkaziladi.'],
        ] as const).map(([value, label, hint]) => (
          <div className="field" key={value}>
            <input id={`mode-${value}`} type="radio" name="mode" checked={s.mode === value} onChange={() => save({ mode: value })} />
            <label htmlFor={`mode-${value}`}>{label}<small>{hint}</small></label>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Sinab köring</h2>
        <textarea value={sample} onChange={(e) => setSample(e.target.value)} aria-label="Namuna matn" />
        <div className="preview">{preview}</div>
      </section>

      <section className="card">
        <h2>Öçirilgan dasturlar</h2>
        <span className="muted">Terminal, kod muharrirlari va parol menejerlari sukut böyiça öçirilgan. {st.currentApp && <>Hozirgi dastur: <b>{st.currentApp}</b>.</>}</span>
        <div className="apps">
          {s.excludedApps.map((a) => (
            <div className="app" key={a}>
              <span>{a}</span>
              <button onClick={() => save({ excludedApps: s.excludedApps.filter((x) => x !== a) })} aria-label={`${a} ni olib taşlaş`}>Olib taşlaş</button>
            </div>
          ))}
        </div>
        <form className="row add" onSubmit={addApp}>
          <input value={newApp} onChange={(e) => setNewApp(e.target.value)} placeholder={PLACEHOLDER[st.platform] ?? ''} aria-label="Dastur nomi" />
          <button type="submit">Qöşiş</button>
        </form>
      </section>

      <section className="card">
        <h2>Alifbo</h2>
        <span className="muted">
          Qonun {st.lawNumber}, kuçga kiradi {st.effectiveOn}. Qoidalar versiyasi {st.rulesVersion}.{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); void openUrl(st.lawUrl); }}>lex.uz</a>
        </span>
        <span className="muted">Ötkazilgan sözlar (şu seansda): {st.convertedWords}. Yozilgan matn heç qayerga yuborilmaydi va saqlanmaydi.</span>
      </section>
    </div>
  );
}
