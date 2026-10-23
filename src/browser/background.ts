import { loadSettings, saveSettings } from '@/shared/storage';

// Minimal service worker: writes default settings on first install so the
// options page and popup show a consistent state. No network, no text access.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void loadSettings().then(saveSettings);
  }
});
