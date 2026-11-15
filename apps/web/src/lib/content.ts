/**
 * Course content for the screens: levels are loaded once and cached; words,
 * kanji and kana can be looked up by their key.
 */
import {
  effectiveStatus,
  loadGrammarList,
  loadKana,
  loadKanjiList,
  loadLevel,
  loadNames,
  loadVocabulary,
  LEVELS,
  type GrammarContent,
  type KanaEntry,
  type KanjiContent,
  type Lesson,
  type LessonContent,
  type LevelId,
  type ListGrammar,
  type ListKanji,
  type ListWord,
  type NameEntry,
  type WordContent,
} from '@j-learn-write/course';

const levels = new Map<LevelId, Promise<Lesson[]>>();
let vocabulary: Promise<Map<number, ListWord>> | undefined;
let kanji: Promise<Map<string, ListKanji>> | undefined;
let grammar: Promise<Map<string, ListGrammar>> | undefined;
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

/** Grammar points of the N5-N4 lists by id. */
export function grammarList(): Promise<Map<string, ListGrammar>> {
  grammar ??= loadGrammarList().then((list) => new Map(list.map((g) => [g.id, g])));
  return grammar;
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

export interface WordEntry {
  word: ListWord;
  content: WordContent | null;
  /** Lesson that teaches the word. */
  lesson: Lesson | null;
}

/** Everything known about one word of the lists. */
export async function findWord(no: number): Promise<WordEntry | undefined> {
  const word = (await listWords()).get(no);
  if (!word) return undefined;
  const lesson = (await lessonsOf(word.level)).find((l) => l.meta.words?.includes(no)) ?? null;
  return { word, content: lesson?.content?.words?.find((w) => w.no === no) ?? null, lesson };
}

export interface KanjiEntry {
  kanji: ListKanji;
  content: KanjiContent | null;
  lesson: Lesson | null;
  /** Course words written with this kanji (N5 first, short words first), with their content when written. */
  words: { word: ListWord; content: WordContent | null }[];
}

/** Everything known about one kanji to learn. */
export async function findKanji(char: string): Promise<KanjiEntry | undefined> {
  const kanji = (await kanjiList()).get(char);
  if (!kanji) return undefined;
  const lesson = (await lessonsOf(kanji.level)).find((l) => l.meta.kanji?.includes(char)) ?? null;
  const levelRank = (w: ListWord) => (w.level === 'n5' ? 0 : 1);
  const listed = [...(await listWords()).values()]
    .filter((w) => w.word.includes(char))
    .sort((a, b) => levelRank(a) - levelRank(b) || [...a.word].length - [...b.word].length || a.no - b.no);
  const words = await Promise.all(listed.map(async (w) => ({ word: w, content: (await findWord(w.no))?.content ?? null })));
  return { kanji, content: lesson?.content?.kanji?.find((k) => k.char === char) ?? null, lesson, words };
}

export interface GrammarEntry {
  grammar: ListGrammar;
  content: GrammarContent | null;
  lesson: Lesson | null;
}

/** Everything known about one grammar point. */
export async function findGrammar(id: string): Promise<GrammarEntry | undefined> {
  const point = (await grammarList()).get(id);
  if (!point) return undefined;
  const lesson = (await lessonsOf(point.level)).find((l) => l.meta.grammar?.includes(id)) ?? null;
  return { grammar: point, content: lesson?.content?.grammar?.find((g) => g.id === id) ?? null, lesson };
}
