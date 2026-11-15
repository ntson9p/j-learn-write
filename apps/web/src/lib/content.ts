/**
 * Course content for the screens: levels are loaded once and cached; words,
 * kanji and kana can be looked up by their key.
 */
import {
  effectiveStatus,
  loadKana,
  loadKanjiList,
  loadLevel,
  loadNames,
  loadVocabulary,
  LEVELS,
  type KanaEntry,
  type Lesson,
  type LessonContent,
  type LevelId,
  type ListKanji,
  type ListWord,
  type NameEntry,
} from '@j-learn-write/course';

const levels = new Map<LevelId, Promise<Lesson[]>>();
let vocabulary: Promise<Map<number, ListWord>> | undefined;
let kanji: Promise<Map<string, ListKanji>> | undefined;
let kana: Promise<KanaEntry[]> | undefined;
let names: Promise<NameEntry[]> | undefined;

export function lessonsOf(level: LevelId): Promise<Lesson[]> {
  let p = levels.get(level);
  if (!p) {
    p = loadLevel(level);
    levels.set(level, p);
  }
  return p;
}

/** Words of the N5-N4 lists by number. */
export function listWords(): Promise<Map<number, ListWord>> {
  vocabulary ??= loadVocabulary().then((list) => new Map(list.map((w) => [w.no, w])));
  return vocabulary;
}

/** Kanji to learn by character. */
export function kanjiList(): Promise<Map<string, ListKanji>> {
  kanji ??= loadKanjiList().then((list) => new Map(list.map((k) => [k.char, k])));
  return kanji;
}

/** Every kana of data/kana.json. */
export function kanaList(): Promise<KanaEntry[]> {
  kana ??= loadKana();
  return kana;
}

export function properNames(): Promise<NameEntry[]> {
  names ??= loadNames();
  return names;
}

/** Level of a lesson id ("kana-01", "n5-12"), or undefined when malformed. */
export function levelOfLesson(lessonId: string): LevelId | undefined {
  const m = /^([a-z0-9]+)-\d\d$/.exec(lessonId);
  return m && (LEVELS as readonly string[]).includes(m[1]!) ? (m[1] as LevelId) : undefined;
}

export async function findLesson(lessonId: string): Promise<Lesson | undefined> {
  const level = levelOfLesson(lessonId);
  if (!level) return undefined;
  return (await lessonsOf(level)).find((l) => l.meta.id === lessonId);
}

/** Kana taught up to and including a kana lesson (for drill distractors). */
export async function kanaTaughtUpTo(lessonId: string): Promise<string[]> {
  const lessons = await lessonsOf('kana');
  const index = lessons.findIndex((l) => l.meta.id === lessonId);
  return lessons.slice(0, index + 1).flatMap((l) => l.meta.kana ?? []);
}

/** True when a teacher has approved every reviewable item of the lesson (practice words, words, kanji, grammar, exercises). */
export function lessonApproved(content: LessonContent): boolean {
  const items = [...(content.practice ?? []), ...(content.words ?? []), ...(content.kanji ?? []), ...(content.grammar ?? []), ...content.exercises];
  return items.every((it) => effectiveStatus(it) === 'approved');
}
