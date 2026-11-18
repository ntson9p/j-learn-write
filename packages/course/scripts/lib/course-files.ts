/** Reads and writes the course data files (Node scripts and tests). */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readingsOfKanji } from '../../src/furigana.ts';
import { KANA_NOT_TAUGHT } from '../../src/jlpt-build.ts';
import type { CurriculumLesson, KanaEntry, LessonContent, LevelStatus, ListGrammar, ListKanji, ListWord, NameEntry } from '../../src/types.ts';
import type { CourseData, FormGrammar } from '../../src/validate.ts';

export const PKG = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = join(PKG, 'data');
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

export interface LessonFile {
  path: string;
  lesson: LessonContent;
}

/** Lesson files, optionally only those whose id starts with one of `filters` ("n5-03", "n5"). */
export function lessonFiles(filters: readonly string[] = []): LessonFile[] {
  const root = join(DATA, 'lessons');
  const out: LessonFile[] = [];
  let dirs: string[] = [];
  try {
    dirs = readdirSync(root).sort();
  } catch {
    return out;
  }
  for (const dir of dirs) {
    const full = join(root, dir);
    if (!statSync(full).isDirectory()) continue;
    for (const f of readdirSync(full).sort()) {
      if (!f.endsWith('.json')) continue;
      const id = `${dir}-${f.replace(/\.json$/, '')}`;
      if (filters.length > 0 && !filters.some((x) => id.startsWith(x))) continue;
      out.push({ path: join(full, f), lesson: readJson<LessonContent>(join(full, f)) });
    }
  }
  return out;
}

/** Canonical formatting of a lesson file (2-space JSON, final newline). */
export function formatLesson(lesson: LessonContent): string {
  return `${JSON.stringify(lesson, null, 2)}\n`;
}

export function writeLesson(file: LessonFile): boolean {
  const text = formatLesson(file.lesson);
  const before = readFileSync(file.path, 'utf8');
  if (before === text) return false;
  writeFileSync(file.path, text, 'utf8');
  return true;
}

export function loadCourseData(filters: readonly string[] = []): CourseData {
  const extra = readJson<{ points: { id: string; counters?: string[] }[] }>(join(DATA, 'grammar-extra.json')).points;
  const counterGrammar: Record<string, string> = {};
  for (const p of extra) for (const c of p.counters ?? []) counterGrammar[c] = p.id;
  return {
    curriculum: readJson<{ lessons: CurriculumLesson[] }>(join(DATA, 'curriculum.json')).lessons,
    vocabulary: readJson<ListWord[]>(join(DATA, 'jlpt', 'vocabulary.json')),
    kanji: readJson<ListKanji[]>(join(DATA, 'jlpt', 'kanji.json')),
    grammar: readJson<ListGrammar[]>(join(DATA, 'jlpt', 'grammar.json')),
    kana: readJson<KanaEntry[]>(join(DATA, 'kana.json')),
    names: readJson<{ names: NameEntry[] }>(join(DATA, 'names.json')).names,
    levels: readJson<{ levels: Record<string, LevelStatus> }>(join(DATA, 'levels.json')).levels,
    lessons: lessonFiles(filters).map((f) => f.lesson),
    formGrammar: readJson<FormGrammar>(join(DATA, 'form-grammar.json')),
    counterGrammar,
    kanaNotTaught: KANA_NOT_TAUGHT,
  };
}

/** Acceptable readings of every kanji of KANJIDIC2 (sources/kanjidic2). */
export function kanjiReadingsMap(): Map<string, Set<string>> {
  const list = readJson<{ char: string; on: string[]; kun: string[] }[]>(join(PKG, 'sources', 'kanjidic2', 'kanji.json'));
  return new Map(list.map((k) => [k.char, readingsOfKanji(k)]));
}

export const rel = (path: string) => relative(PKG, path);
