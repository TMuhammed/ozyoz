import { convertText, convertWordAtCaret, RULESET, type ConversionOptions } from '@/core';
import type { Settings } from '@/shared/settings';
import { shouldHandle, type TextField } from './site-policy';

export interface AdapterContext {
  /** Returns true when conversion is active for this page right now. */
  isActive(): boolean;
  getSettings(): Settings;
}

/**
 * Attaches delegated listeners to a document (or shadow root). Handles
 * <input> and <textarea>. Returns a detach function.
 *
 * Strategy (see docs/browser-behaviour.md):
 *  - Only react to `input` events whose inputType is plain text insertion.
 *    Deletions, undo/redo and IME composition never trigger conversion, so
 *    Ctrl+Z restores the original spelling instead of being re-converted.
 *  - Convert only the word ending at the caret via convertWordAtCaret.
 *  - Apply the replacement with execCommand('insertText') so it joins the
 *    native undo stack and fires a trusted-looking input event for frameworks.
 *  - A re-entrancy flag ignores the input event we cause ourselves.
 */
export function attachInputAdapter(root: Document | ShadowRoot, ctx: AdapterContext): () => void {
  let suppressed = false;
  const composing = new WeakSet<Element>();

  const conversionOptions = (): ConversionOptions => ({
    normalizeApostrophes: ctx.getSettings().normalizeApostrophes,
    protectUrls: true,
  });

  function targetOf(e: Event): unknown {
    const path = e.composedPath();
    return path.length > 0 ? path[0] : e.target;
  }

  function replaceRange(el: TextField, start: number, end: number, replacement: string, caretAfter: number): void {
    suppressed = true;
    try {
      el.setSelectionRange(start, end);
      let ok = false;
      try {
        ok = document.execCommand('insertText', false, replacement);
      } catch {
        ok = false;
      }
      if (!ok || el.value.slice(start, start + replacement.length) !== replacement) {
        // Fallback: direct value edit + synthetic event (loses native undo for this step).
        el.setRangeText(replacement, start, end, 'end');
        notifyFrameworks(el);
      }
      el.setSelectionRange(caretAfter, caretAfter);
    } finally {
      suppressed = false;
    }
  }

  function onInput(e: Event): void {
    if (suppressed || !ctx.isActive()) return;
    const el = targetOf(e);
    if (!shouldHandle(el)) return;
    const ie = e as InputEvent;
    if (ie.isComposing || composing.has(el)) return;
    const inputType = ie.inputType ?? 'insertText';
    if (inputType !== 'insertText') return;
    if (el.selectionStart === null || el.selectionStart !== el.selectionEnd) return;

    const caret = el.selectionStart;
    const value = el.value;
    const mode = ctx.getSettings().ambiguousMode;

    let wordEnd = caret;
    if (mode === 'wordBoundary') {
      // Convert the previous word only once a non-word character has been typed.
      const typed = ie.data ?? '';
      if (typed.length !== 1 || /[\p{L}\p{M}'’‘ʻʼ`´]/u.test(typed)) return;
      wordEnd = caret - 1;
    }

    const r = convertWordAtCaret(value, wordEnd, conversionOptions(), RULESET);
    if (!r) return;
    const caretAfter = caret - (r.end - r.start) + r.replacement.length;
    replaceRange(el, r.start, r.end, r.replacement, caretAfter);
  }

  function onPaste(ev: Event): void {
    const e = ev as ClipboardEvent;
    if (suppressed || !ctx.isActive() || !ctx.getSettings().convertPaste) return;
    const el = targetOf(e);
    if (!shouldHandle(el)) return;
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    const result = convertText(text, conversionOptions());
    if (!result.changed) return;
    e.preventDefault();
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    replaceRange(el, start, end, result.text, start + result.text.length);
  }

  function onCompositionStart(e: Event): void {
    const el = targetOf(e);
    if (el instanceof Element) composing.add(el);
  }
  function onCompositionEnd(e: Event): void {
    const el = targetOf(e);
    if (el instanceof Element) composing.delete(el);
  }

  root.addEventListener('input', onInput, true);
  root.addEventListener('paste', onPaste, true);
  root.addEventListener('compositionstart', onCompositionStart, true);
  root.addEventListener('compositionend', onCompositionEnd, true);
  return () => {
    root.removeEventListener('input', onInput, true);
    root.removeEventListener('paste', onPaste, true);
    root.removeEventListener('compositionstart', onCompositionStart, true);
    root.removeEventListener('compositionend', onCompositionEnd, true);
  };
}

/**
 * React and similar frameworks track the value via a patched setter; after a
 * direct DOM edit we re-run the native setter and dispatch `input` so their
 * state updates. Only used on the fallback path.
 */
function notifyFrameworks(el: TextField): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  const value = el.value;
  if (setter) setter.call(el, value);
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: null }));
}
