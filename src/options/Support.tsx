import { useState } from 'react';
import { SUPPORT, formatCard, hasSupportInfo } from '@/shared/support';

export function Support() {
  const [copied, setCopied] = useState(false);
  if (!hasSupportInfo()) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT.cardNumber.replace(/\D/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the number is still visible to select */
    }
  };

  return (
    <section className="card">
      <h2>Dasturçini qöllab-quvvatlaş</h2>
      <span className="muted">
        Özyoz bepul va reklamasiz. Agar foydali bölsa, dasturçini qöllab-quvvatlaşingiz mumkin — bu loyihani
        rivojlantirişga yordam beradi.
      </span>
      <div className="actions">
        {SUPPORT.donateUrl && (
          <a className="button" href={SUPPORT.donateUrl} target="_blank" rel="noreferrer">
            Qöllab-quvvatlaş
          </a>
        )}
        {SUPPORT.telegramUrl && (
          <a className="button" href={SUPPORT.telegramUrl} target="_blank" rel="noreferrer">
            Telegram
          </a>
        )}
        {SUPPORT.repoUrl && (
          <a className="button" href={SUPPORT.repoUrl} target="_blank" rel="noreferrer">
            Manba kodi
          </a>
        )}
      </div>
      {SUPPORT.cardNumber && (
        <div className="cardnum">
          <span className="muted">{SUPPORT.cardLabel || 'Karta'} hamyoni:</span>
          <code aria-label="Karta raqami">{formatCard(SUPPORT.cardNumber)}</code>
          <button type="button" onClick={() => void copy()}>{copied ? 'Nusxalandi ✓' : 'Nusxalaş'}</button>
        </div>
      )}
    </section>
  );
}
