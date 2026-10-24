/**
 * "Support the developer" details shown in the options page and popup.
 * Leave a field empty to hide it. Prefer a link you control (donation page,
 * Telegram post) over a hard-coded card number: a link can be changed without
 * releasing a new version, and a card number published here is public forever.
 */
export const SUPPORT = {
  /** Donation page (Tirikchilik, Payme/Click link, Buy Me a Coffee, ...). */
  donateUrl: '',
  /** Dedicated virtual card for donations, digits only. Shown with a copy button. */
  cardNumber: '8801809231336725',
  /** Card system label shown next to the number, e.g. "Humo" or "Uzcard". */
  cardLabel: 'Click',
  /** Telegram channel or chat for feedback. */
  telegramUrl: '',
  /** Source code / issue tracker. */
  repoUrl: '',
};

export function formatCard(digits: string): string {
  return digits.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function hasSupportInfo(): boolean {
  return Boolean(SUPPORT.donateUrl || SUPPORT.cardNumber || SUPPORT.telegramUrl || SUPPORT.repoUrl);
}
