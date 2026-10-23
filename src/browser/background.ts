import { convertText } from '@/core';
import { loadSettings, saveSettings } from '@/shared/storage';

// Writes default settings on first install so the popup and options page show
// a consistent state. No network, no access to page text.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void loadSettings().then(saveSettings);
  }
});

// Omnibox keyword "uz": the browser UI itself cannot be edited by extensions,
// so the address bar is handled via Chrome's keyword mechanism. The user types
// "uz salom shahar", sees the converted query as a suggestion and, on Enter,
// searches for it with their default search engine.
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function converted(text: string): string {
  return convertText(text.trim(), { normalizeApostrophes: false, protectUrls: true }).text;
}

chrome.omnibox.setDefaultSuggestion({ description: 'UzAlif: yangi alifboda qidirish — matn yozing' });

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const out = converted(text);
  if (!out) return;
  chrome.omnibox.setDefaultSuggestion({ description: `${escapeXml(out)} <dim>— qidirish</dim>` });
  suggest([{ content: out, description: `<match>${escapeXml(out)}</match> <dim>— UzAlif</dim>` }]);
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const query = converted(text);
  if (!query) return;
  const map: Record<chrome.omnibox.OnInputEnteredDisposition, 'CURRENT_TAB' | 'NEW_TAB' | 'NEW_WINDOW'> = {
    currentTab: 'CURRENT_TAB',
    newForegroundTab: 'NEW_TAB',
    newBackgroundTab: 'NEW_TAB',
  };
  void chrome.search.query({ text: query, disposition: map[disposition] });
});
