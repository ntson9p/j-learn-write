/**
 * Local storage of the learner's progress (IndexedDB). Nothing leaves the
 * device; the backup file (backup.ts) is the only way to move data.
 *
 * Every store has a key path, so a record always carries its own key. When
 * the schema changes, bump DB_VERSION and add a step to `upgrade`.
 */
import type { LevelId } from '@j-learn-write/course';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const DB_NAME = 'j-learn-write';
export const DB_VERSION = 1;

/** FSRS card state of one word or kanji (dates as epoch milliseconds). */
export interface StoredCard {
  wordId: string;
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** 0 new, 1 learning, 2 review, 3 relearning (ts-fsrs State). */
  state: number;
  lastReview: number | null;
  addedAt: number;
}

export interface StoredReviewLog {
  id?: number;
  wordId: string;
  /** When the learner answered. */
  time: number;
  /** 1 again, 2 hard, 3 good, 4 easy. */
  rating: number;
  /** Card state before this review. */
  state: number;
  scheduledDays: number;
  stability: number;
  difficulty: number;
}

export interface ExerciseRecord {
  correct: boolean;
  /** 0-100. */
  score: number;
  at: number;
}

export interface LessonProgress {
  lessonId: string;
  startedAt: number;
  /** Set when the lesson quiz reached the pass mark. */
  completedAt: number | null;
  /** Best lesson-quiz score, 0-100. */
  bestScore: number;
  /** Latest result per exercise id. */
  exercises: Record<string, ExerciseRecord>;
}

export interface TestResult {
  id?: number;
  kind: 'lesson' | 'level';
  level: LevelId;
  lessonId?: string;
  /** Percent, 0-100. */
  score: number;
  at: number;
  durationMs: number;
  /** Grammar point ids with wrong answers. */
  weakGrammar: string[];
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export interface AppDB extends DBSchema {
  settings: { key: string; value: SettingRecord };
  cards: { key: string; value: StoredCard; indexes: { due: number } };
  reviewLogs: { key: number; value: StoredReviewLog; indexes: { wordId: string; time: number } };
  lessons: { key: string; value: LessonProgress };
  results: { key: number; value: TestResult; indexes: { level: LevelId } };
}

export type StoreName = 'settings' | 'cards' | 'reviewLogs' | 'lessons' | 'results';

/** Store names with their key paths (used by backup validation). */
export const STORES: Readonly<Record<StoreName, { keyPath: string; autoIncrement: boolean }>> = {
  settings: { keyPath: 'key', autoIncrement: false },
  cards: { keyPath: 'wordId', autoIncrement: false },
  reviewLogs: { keyPath: 'id', autoIncrement: true },
  lessons: { keyPath: 'lessonId', autoIncrement: false },
  results: { keyPath: 'id', autoIncrement: true },
};

let opening: Promise<IDBPDatabase<AppDB>> | undefined;

export function db(): Promise<IDBPDatabase<AppDB>> {
  opening ??= openDB<AppDB>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('settings', { keyPath: 'key' });
        const cards = database.createObjectStore('cards', { keyPath: 'wordId' });
        cards.createIndex('due', 'due');
        const logs = database.createObjectStore('reviewLogs', { keyPath: 'id', autoIncrement: true });
        logs.createIndex('wordId', 'wordId');
        logs.createIndex('time', 'time');
        database.createObjectStore('lessons', { keyPath: 'lessonId' });
        const results = database.createObjectStore('results', { keyPath: 'id', autoIncrement: true });
        results.createIndex('level', 'level');
      }
    },
  });
  return opening;
}

/** Closes the connection and forgets it (tests, and before deleting the database). */
export async function closeDb(): Promise<void> {
  if (!opening) return;
  const database = await opening;
  database.close();
  opening = undefined;
}

/** Erases every record (used by "Xóa toàn bộ dữ liệu" and tests). */
export async function clearAll(): Promise<void> {
  const database = await db();
  const names = Object.keys(STORES) as StoreName[];
  const tx = database.transaction(names, 'readwrite');
  await Promise.all([...names.map((n) => tx.objectStore(n).clear()), tx.done]);
}

/**
 * Asks the browser not to evict our data under storage pressure. Returns
 * whether storage is persistent (false when the API is missing).
 */
export async function requestPersistence(): Promise<boolean> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.persist) return false;
  try {
    if (storage.persisted && (await storage.persisted())) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}
