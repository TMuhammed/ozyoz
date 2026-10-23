import { useEffect, useState } from 'react';
import { RULESET } from '@/core';
import { DEFAULT_SETTINGS, isActiveFor, isPaused, isSiteDisabled, siteKey, type Settings } from '@/shared/settings';
import { loadSettings, onSettingsChanged, updateSettings } from '@/shared/storage';

async function currentHostname(): Promise<string> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return '';
    const url = new URL(tab.url);
    if (!/^https?:$/.test(url.protocol)) return '';
    return url.hostname;
  } catch {
    return '';
  }
}

export function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [host, setHost] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void loadSettings().then(setSettings);
    void currentHostname().then(setHost);
    const off = onSettingsChanged(setSettings);
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, []);

  const paused = isPaused(settings, now);
  const siteOff = host !== '' && isSiteDisabled(settings, host);
  const active = host !== '' && isActiveFor(settings, host, now);

  const patch = (p: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...p }));
    void updateSettings(p);
  };
  const toggleEnabled = () => patch({ enabled: !settings.enabled });
  const toggleSite = () => {
    if (!host) return;
    const key = siteKey(host);
    const list = siteOff ? settings.disabledSites.filter((d) => d !== key) : [...settings.disabledSites, key];
    patch({ disabledSites: list });
  };
  const pause = (minutes: number) => patch({ pausedUntil: Date.now() + minutes * 60_000 });
  const resume = () => patch({ pausedUntil: null });

  const statusText = !settings.enabled
    ? 'Oʻchirilgan'
    : paused
      ? `Pauza: ${Math.max(1, Math.ceil(((settings.pausedUntil ?? 0) - now) / 60_000))} daqiqa`
      : host === ''
        ? 'Bu sahifada ishlamaydi'
        : siteOff
          ? 'Bu saytda oʻchirilgan'
          : 'Faol';

  return (
    <main className="popup">
      <header className="header">
        <div className="logo" aria-hidden="true">Ö</div>
        <div>
          <div className="title">UzAlif</div>
          <div className="subtitle">sh→ş · ch→ç · oʻ→ö · gʻ→ğ</div>
        </div>
      </header>

      <div className="row">
        <div className="row-label">
          <span>Avtomatik oʻtkazish</span>
          <small className="status"><span className={`dot${active ? ' on' : ''}`} />{statusText}</small>
        </div>
        <label className="switch">
          <input type="checkbox" checked={settings.enabled} onChange={toggleEnabled} aria-label="Avtomatik oʻtkazishni yoqish" />
          <span className="slider" />
        </label>
      </div>

      <div className="row">
        <div className="row-label">
          <span>{host ? host : 'Sayt aniqlanmadi'}</span>
          <small>Shu saytda</small>
        </div>
        <label className="switch">
          <input type="checkbox" checked={!siteOff} disabled={!host} onChange={toggleSite} aria-label="Shu saytda yoqish" />
          <span className="slider" />
        </label>
      </div>

      <hr />

      <div className="actions">
        {paused ? (
          <button type="button" onClick={resume}>Davom ettirish</button>
        ) : (
          <>
            <button type="button" onClick={() => pause(15)}>15 daqiqa pauza</button>
            <button type="button" onClick={() => pause(60)}>1 soat pauza</button>
          </>
        )}
        <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>Sozlamalar</button>
      </div>

      <footer className="footer">
        <span>Alifbo: {RULESET.source.number} · v{RULESET.version}</span>
        <a href={RULESET.source.url} target="_blank" rel="noreferrer">lex.uz</a>
      </footer>
    </main>
  );
}
