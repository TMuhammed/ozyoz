import { attachInputAdapter } from './input-adapter';
import { attachContenteditableAdapter } from './contenteditable-adapter';
import { isActiveFor, type Settings } from '@/shared/settings';
import { loadSettings, onSettingsChanged } from '@/shared/storage';

let settings: Settings | null = null;
const hostname = location.hostname;

function isActive(): boolean {
  return settings !== null && isActiveFor(settings, hostname);
}

async function main(): Promise<void> {
  settings = await loadSettings();
  onSettingsChanged((next) => {
    settings = next;
  });
  const ctx = {
    isActive,
    getSettings: () => settings ?? ({} as Settings),
  };
  attachInputAdapter(document, ctx);
  attachContenteditableAdapter(document, ctx);
}

void main();
