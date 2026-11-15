/** Handwriting practice records (per character), kept in the settings store. */
import { db } from './db';

export interface WritingRecord {
  /** Completed quizzes. */
  done: number;
  /** Fewest mistakes in a completed quiz. */
  best: number;
  at: number;
}

const KEY = 'writing';

export async function writingRecords(): Promise<Record<string, WritingRecord>> {
  const r = await (await db()).get('settings', KEY);
  return (r?.value as Record<string, WritingRecord> | undefined) ?? {};
}

export async function recordWriting(ch: string, mistakes: number, now: Date): Promise<WritingRecord> {
  const database = await db();
  const tx = database.transaction('settings', 'readwrite');
  const all = ((await tx.store.get(KEY))?.value as Record<string, WritingRecord> | undefined) ?? {};
  const prev = all[ch];
  const next: WritingRecord = { done: (prev?.done ?? 0) + 1, best: Math.min(prev?.best ?? Infinity, mistakes), at: now.getTime() };
  all[ch] = next;
  await tx.store.put({ key: KEY, value: all });
  await tx.done;
  return next;
}

/** File of a character's stroke data (see build/strokes.ts). */
export const strokeUrl = (ch: string) => `./strokes/${ch.codePointAt(0)!.toString(16)}.json`;
