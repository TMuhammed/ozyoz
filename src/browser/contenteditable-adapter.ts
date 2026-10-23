import { convertText, convertWordAtCaret, RULESET, type ConversionOptions } from '@/core';
import type { AdapterContext } from './input-adapter';
import { isSensitiveField, isCodeLike } from './site-policy';

/**
 * Hosts whose editors are known or suspected to break with programmatic text
 * replacement. Conversion in contenteditable is skipped there; plain
 * <input>/<textarea> still work. Not verified in-browser yet — listed as a
 * precaution (see docs/browser-behaviour.md).
 */
export const UNSUPPORTED_CONTENTEDITABLE_HOSTS = ['docs.google.com'];

export function editableHost(node: Node | null): HTMLElement | null {
  let el: Node | null = node;
  while (el && !(el instanceof HTMLElement)) el = el.parentNode;
  if (!el) return null;
  const host = (el as HTMLElement).closest('[contenteditable]');
  if (!(host instanceof HTMLElement)) return null;
  const v = host.getAttribute('contenteditable');
  if (v === null || v === 'false') return null;
  return host.isContentEditable ? host : null;
}

function selectionIn(root: Document | ShadowRoot): Selection | null {
  const r = root as unknown as { getSelection?: () => Selection | null };
  return typeof r.getSelection === 'function' ? r.getSelection() : document.getSelection();
}

/**
 * Handles contenteditable surfaces. Only text inside the single text node that
 * holds the caret is converted; words split across inline elements are left as
 * they are. Replacement goes through execCommand('insertText') so that the
 * editor's own beforeinput handling and the native undo stack stay intact. If
 * the command is refused the edit is skipped — never a direct DOM mutation.
 */
export function attachContenteditableAdapter(root: Document | ShadowRoot, ctx: AdapterContext): () => void {
  let suppressed = false;
  const composing = new WeakSet<Element>();
  const hostUnsupported = UNSUPPORTED_CONTENTEDITABLE_HOSTS.some(
    (h) => location.hostname === h || location.hostname.endsWith('.' + h),
  );

  const conversionOptions = (): ConversionOptions => ({
    normalizeApostrophes: ctx.getSettings().normalizeApostrophes,
    protectUrls: true,
  });

  function usableHost(e: Event): HTMLElement | null {
    const path = e.composedPath();
    const target = (path.length > 0 ? path[0] : e.target) as Node | null;
    const host = editableHost(target);
    if (!host || hostUnsupported) return null;
    if (isSensitiveField(host) || isCodeLike(host)) return null;
    return host;
  }

  function insertViaCommand(replacement: string): boolean {
    suppressed = true;
    try {
      return document.execCommand('insertText', false, replacement);
    } catch {
      return false;
    } finally {
      suppressed = false;
    }
  }

  function onInput(e: Event): void {
    if (suppressed || !ctx.isActive()) return;
    const host = usableHost(e);
    if (!host) return;
    const ie = e as InputEvent;
    if (ie.isComposing || composing.has(host)) return;
    if ((ie.inputType ?? 'insertText') !== 'insertText') return;

    const sel = selectionIn(root);
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    if (!(node instanceof Text) || !host.contains(node)) return;

    const caret = sel.anchorOffset;
    let wordEnd = caret;
    if (ctx.getSettings().ambiguousMode === 'wordBoundary') {
      const typed = ie.data ?? '';
      if (typed.length !== 1 || /[\p{L}\p{M}'’‘ʻʼ`´]/u.test(typed)) return;
      wordEnd = caret - 1;
    }

    const r = convertWordAtCaret(node.data, wordEnd, conversionOptions(), RULESET);
    if (!r) return;
    const tail = caret - r.end; // characters after the converted word (0 or 1)

    const range = document.createRange();
    range.setStart(node, r.start);
    range.setEnd(node, r.end);
    sel.removeAllRanges();
    sel.addRange(range);
    const ok = insertViaCommand(r.replacement);
    if (!ok) {
      // Restore the caret and give up; never mutate the editor's DOM directly.
      sel.collapse(node, Math.min(caret, node.data.length));
      return;
    }
    if (tail > 0) {
      const after = selectionIn(root);
      const n = after?.anchorNode;
      if (after && n instanceof Text) after.collapse(n, Math.min(after.anchorOffset + tail, n.data.length));
    }
  }

  function onPaste(ev: Event): void {
    const e = ev as ClipboardEvent;
    if (suppressed || !ctx.isActive() || !ctx.getSettings().convertPaste) return;
    const host = usableHost(e);
    if (!host || !e.clipboardData) return;
    // Only plain-text clipboards: rich editors handle HTML paste themselves.
    const types = Array.from(e.clipboardData.types);
    if (types.some((t) => t !== 'text/plain')) return;
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    const result = convertText(text, conversionOptions());
    if (!result.changed) return;
    e.preventDefault();
    insertViaCommand(result.text);
  }

  function onCompositionStart(e: Event): void {
    const host = usableHost(e);
    if (host) composing.add(host);
  }
  function onCompositionEnd(e: Event): void {
    const host = usableHost(e);
    if (host) composing.delete(host);
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
