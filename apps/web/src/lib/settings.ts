/**
 * Learner settings, kept in the "settings" store and mirrored in a signal so
 * that every screen reacts to changes.
 */
import { signal } from '@preact/signals';
import { db } from './db';

export type Theme = 'auto' | 'light' | 'dark';
/** Furigana over kanji: only over kanji not learned yet, always, or never. */
export type FuriganaMode = 'auto' | 'always' | 'never';

export interface Settings {
  theme: Theme;
  /** New words introduced per day. */
  newWordsPerDay: number;
  /** Speech rate for the device voice (0.5-1.2). */
  speechRate: number;
  /** Preferred ja-JP voice (SpeechSynthesisVoice.voiceURI), or null for automatic. */
  voiceURI: string | null;
  /** When to show furigana over kanji. */
  furigana: FuriganaMode;
  /** Show the Hán Việt reading of words inside example sentences (word and kanji cards always show it). */
  showHanViet: boolean;
  /** Date (YYYY-MM-DD) of the last backup the learner downloaded. */
  lastBackup: string | null;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  theme: 'auto',
  newWordsPerDay: 10,
  speechRate: 0.8,
  voiceURI: null,
  furigana: 'auto',
  showHanViet: false,
  lastBackup: null,
};

export const settings = signal<Settings>({ ...DEFAULT_SETTINGS });

const KEY = 'settings';

/** Keeps only known keys with values of the right type. */
export function sanitizeSettings(input: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (typeof input !== 'object' || input === null) return out;
  const v = input as Record<string, unknown>;
  if (v.theme === 'auto' || v.theme === 'light' || v.theme === 'dark') out.theme = v.theme;
  if (typeof v.newWordsPerDay === 'number' && Number.isInteger(v.newWordsPerDay) && v.newWordsPerDay >= 0 && v.newWordsPerDay <= 50) {
    out.newWordsPerDay = v.newWordsPerDay;
  }
  if (typeof v.speechRate === 'number' && v.speechRate >= 0.5 && v.speechRate <= 1.2) out.speechRate = v.speechRate;
  if (typeof v.voiceURI === 'string' || v.voiceURI === null) out.voiceURI = v.voiceURI as string | null;
  if (v.furigana === 'auto' || v.furigana === 'always' || v.furigana === 'never') out.furigana = v.furigana;
  if (typeof v.showHanViet === 'boolean') out.showHanViet = v.showHanViet;
  if (typeof v.lastBackup === 'string' || v.lastBackup === null) out.lastBackup = v.lastBackup as string | null;
  return out;
}

export async function loadSettings(): Promise<Settings> {
  const record = await (await db()).get('settings', KEY);
  settings.value = sanitizeSettings(record?.value);
  return settings.value;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const next = sanitizeSettings({ ...settings.value, ...patch });
  settings.value = next;
  await (await db()).put('settings', { key: KEY, value: next });
}

/** Applies the theme to <html data-theme>; "auto" follows the system. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;
}
