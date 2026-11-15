/**
 * Course data for the app: the curriculum (small, loaded at once) and the
 * lesson contents, loaded on demand one level at a time.
 */
import curriculumFile from '../data/curriculum.json';
import levelsFile from '../data/levels.json';
import type { CurriculumLesson, Lesson, LessonContent, LevelId, LevelStatus } from './types.ts';

/** Levels in learning order. */
export const LEVELS: readonly LevelId[] = ['kana', 'n5', 'n4'];
export const LEVEL_STATUS = levelsFile.levels as Readonly<Record<LevelId, LevelStatus>>;
export const CURRICULUM = curriculumFile.lessons as readonly CurriculumLesson[];

const contentLoaders = import.meta.glob<LessonContent>('../data/lessons/*/*.json', { import: 'default' });
const contentPath = (l: CurriculumLesson) => `../data/lessons/${l.level}/${String(l.order).padStart(2, '0')}.json`;

/** Curriculum lessons of a level, in order. */
export function curriculumOf(level: LevelId): CurriculumLesson[] {
  return CURRICULUM.filter((l) => l.level === level).sort((a, b) => a.order - b.order);
}

/** True when the lesson's content has been written. */
export function hasContent(lesson: CurriculumLesson): boolean {
  return contentPath(lesson) in contentLoaders;
}

/** Lessons of a level with their content (null when not written yet). */
export async function loadLevel(level: LevelId): Promise<Lesson[]> {
  return Promise.all(
    curriculumOf(level).map(async (meta) => {
      const load = contentLoaders[contentPath(meta)];
      return { meta, content: load ? await load() : null };
    }),
  );
}

/** Word id used by the app's storage: "w0001". */
export const wordId = (no: number) => `w${String(no).padStart(4, '0')}`;
/** Kanji card id: "k" + the character. */
export const kanjiId = (char: string) => `k${char}`;
