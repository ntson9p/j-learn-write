import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll } from '../src/lib/db';
import { applyTheme, DEFAULT_SETTINGS, loadSettings, sanitizeSettings, settings, updateSettings } from '../src/lib/settings';

describe('settings', () => {
  beforeEach(async () => {
    await clearAll();
    settings.value = { ...DEFAULT_SETTINGS };
  });

  it('keeps only valid values', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ theme: 'pink', newWordsPerDay: 500, speechRate: 3, extra: 1 })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ theme: 'dark', newWordsPerDay: 5 })).toMatchObject({ theme: 'dark', newWordsPerDay: 5 });
    expect(sanitizeSettings({ furigana: 'always', showHanViet: true })).toMatchObject({ furigana: 'always', showHanViet: true });
    expect(sanitizeSettings({ furigana: 'sometimes', showHanViet: 'yes' })).toMatchObject({ furigana: 'auto', showHanViet: false });
  });

  it('persists updates', async () => {
    await updateSettings({ theme: 'light', newWordsPerDay: 15 });
    settings.value = { ...DEFAULT_SETTINGS };
    const loaded = await loadSettings();
    expect(loaded).toMatchObject({ theme: 'light', newWordsPerDay: 15 });
  });

  it('applies the theme to the root element', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    applyTheme('auto', root);
    expect(root.dataset.theme).toBeUndefined();
  });
});
