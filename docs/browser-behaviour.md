# Browser behaviour and known limitations

## How conversion is applied

| Element | Detection | Replacement method | Undo |
|---|---|---|---|
| `<input type=text|search>` and `<textarea>` | delegated `input` event, `composedPath()[0]` | select the word range, `document.execCommand('insertText')` | native undo stack: Ctrl+Z restores the old spelling |
| `contenteditable` | same, caret must be inside one `Text` node | same; if the command is refused the edit is skipped | native (or the editor's own, via `beforeinput`) |

Only `input` events with `inputType === "insertText"` trigger conversion.
Deletions, `historyUndo`, `historyRedo`, spell-check replacements and IME
composition (`isComposing`, or between `compositionstart`/`compositionend`)
are ignored, so undo never gets re-converted and IMEs are never interrupted.

Conversion is limited to the word that ends at the caret
(`convertWordAtCaret`). The rest of the field is never rewritten.

Paste: `<input>`/`<textarea>` convert `text/plain` pastes and insert the result
with `insertText` (one undo step). In `contenteditable`, paste is converted only
when the clipboard carries *nothing but* `text/plain`; HTML pastes are left to
the editor.

A re-entrancy flag ignores the `input` event produced by our own `insertText`.

## Fallback path

If `execCommand('insertText')` returns false on an `<input>`/`<textarea>`
(some browsers refuse it on hidden or detached elements), the adapter uses
`setRangeText` and dispatches a synthetic `input` event after re-running the
native value setter so React-style controlled inputs update. That step is not
part of the native undo history.

For `contenteditable` there is no fallback: a refused command means the editor
is skipped, because direct DOM edits inside third-party editors risk text loss.

## Not handled (by design)

- Password, e-mail, URL, tel and number inputs; `autocomplete` values for cards,
  passwords and one-time codes; fields whose name/id/aria-label mention card,
  CVV, password, PIN, IBAN, passport, token or secret.
- Elements inside `<pre>`, `<code>`, CodeMirror, Monaco and Ace editors.
- Any element inside a container with `data-uzalif="off"`.
- Closed shadow roots (events are not observable there).
- `docs.google.com` contenteditable (precautionary; not verified).
- Words that span several inline elements inside a contenteditable
  (for example `s<b>h</b>`): each text node is converted on its own.
- Pages where the hostname is disabled by the user, while paused, or while the
  global switch is off.

## Chromium specifics

- `execCommand` is deprecated but remains the only way to insert text that
  joins the native undo stack; Chromium has no plans to remove it.
- `setRangeText` and assigning `.value` reset the element's undo stack in
  Chromium; this is why they are only used on the fallback path.
- Chrome, Edge and Yandex Browser share this engine; the same build is used.
