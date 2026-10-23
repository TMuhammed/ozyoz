// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isCodeLike, isSensitiveField, isTextField, shouldHandle } from '@/browser/site-policy';

function el(html: string): Element {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild!;
}

describe('isTextField', () => {
  it('accepts text, search, untyped inputs and textareas', () => {
    expect(isTextField(el('<input type="text">'))).toBe(true);
    expect(isTextField(el('<input type="search">'))).toBe(true);
    expect(isTextField(el('<input>'))).toBe(true);
    expect(isTextField(el('<textarea></textarea>'))).toBe(true);
  });
  it('rejects other input types and non-inputs', () => {
    for (const t of ['password', 'email', 'url', 'number', 'tel', 'checkbox', 'date', 'file']) {
      expect(isTextField(el(`<input type="${t}">`))).toBe(false);
    }
    expect(isTextField(el('<div contenteditable></div>'))).toBe(false);
    expect(isTextField(null)).toBe(false);
  });
});

describe('isSensitiveField', () => {
  it('flags passwords, payment and identity fields', () => {
    expect(isSensitiveField(el('<input type="password">'))).toBe(true);
    expect(isSensitiveField(el('<input type="text" autocomplete="cc-number">'))).toBe(true);
    expect(isSensitiveField(el('<input type="text" autocomplete="one-time-code">'))).toBe(true);
    expect(isSensitiveField(el('<input type="text" name="cardNumber">'))).toBe(true);
    expect(isSensitiveField(el('<input type="text" id="cvv">'))).toBe(true);
    expect(isSensitiveField(el('<input type="text" aria-label="Passport number">'))).toBe(true);
    expect(isSensitiveField(el('<input type="text" inputmode="numeric">'))).toBe(true);
    expect(isSensitiveField(el('<div data-uzalif="off"><input id="x" type="text"></div>').querySelector('#x')!)).toBe(true);
  });
  it('does not flag ordinary fields', () => {
    expect(isSensitiveField(el('<input type="text" name="comment">'))).toBe(false);
    expect(isSensitiveField(el('<textarea name="message"></textarea>'))).toBe(false);
    expect(isSensitiveField(el('<input type="text" name="pinned_note">'))).toBe(false);
  });
});

describe('isCodeLike / shouldHandle', () => {
  it('skips code editors, disabled and readonly fields', () => {
    expect(isCodeLike(el('<div class="monaco-editor"><textarea id="t"></textarea></div>').querySelector('#t')!)).toBe(true);
    expect(shouldHandle(el('<textarea disabled></textarea>'))).toBe(false);
    expect(shouldHandle(el('<textarea readonly></textarea>'))).toBe(false);
    expect(shouldHandle(el('<textarea></textarea>'))).toBe(true);
  });
});
