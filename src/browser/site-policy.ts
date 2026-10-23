/**
 * Decides which editable elements UzAlif may touch. Pure DOM predicates, no state.
 */

export type TextField = HTMLInputElement | HTMLTextAreaElement;

const TEXT_INPUT_TYPES = new Set(['text', 'search', '']);

const SENSITIVE_AUTOCOMPLETE = /^(cc-|one-time-code|new-password|current-password)/i;
const SENSITIVE_NAME = /(passw|pwd|secret|token|otp|cvv|cvc|card|iban|pin\b|ssn|passport)/i;

export function isTextField(el: unknown): el is TextField {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has((el.getAttribute('type') ?? '').toLowerCase());
  return false;
}

export function isEditable(el: TextField): boolean {
  return !el.disabled && !el.readOnly;
}

/** Password, payment and other sensitive inputs that must never be modified. */
export function isSensitiveField(el: Element): boolean {
  if (el instanceof HTMLInputElement) {
    const type = (el.getAttribute('type') ?? '').toLowerCase();
    if (type === 'password' || type === 'email' || type === 'url' || type === 'tel' || type === 'number') return true;
  }
  const autocomplete = el.getAttribute('autocomplete') ?? '';
  if (SENSITIVE_AUTOCOMPLETE.test(autocomplete)) return true;
  const inputMode = el.getAttribute('inputmode') ?? '';
  if (inputMode === 'numeric' || inputMode === 'tel' || inputMode === 'email' || inputMode === 'url') return true;
  const hint = `${el.getAttribute('name') ?? ''} ${el.id} ${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('data-testid') ?? ''}`;
  if (SENSITIVE_NAME.test(hint)) return true;
  if (el.getAttribute('data-uzalif') === 'off' || el.closest('[data-uzalif="off"]')) return true;
  return false;
}

/** Spellcheck="false" fields are usually code editors, usernames, etc.; keep them, except inside code-like containers. */
export function isCodeLike(el: Element): boolean {
  return Boolean(el.closest('pre, code, .CodeMirror, .cm-editor, .monaco-editor, .ace_editor'));
}

export function shouldHandle(el: unknown): el is TextField {
  return isTextField(el) && isEditable(el) && !isSensitiveField(el) && !isCodeLike(el);
}
