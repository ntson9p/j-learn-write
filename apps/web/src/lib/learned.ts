/**
 * Kanji the learner has learned: the kanji of every lesson whose quiz they
 * passed. Furigana in "auto" mode is shown only over the other kanji.
 */
import { CURRICULUM, type CurriculumLesson } from '@j-learn-write/course';
import { signal } from '@preact/signals';
import type { LessonProgress } from './db';
import { allLessonProgress } from './progress';

export const learnedKanji = signal<ReadonlySet<string>>(new Set());

/** Kanji of the completed lessons (pure). */
export function kanjiOfCompleted(curriculum: readonly CurriculumLesson[], progress: ReadonlyMap<string, LessonProgress>): Set<string> {
  return new Set(curriculum.filter((l) => progress.get(l.id)?.completedAt).flatMap((l) => l.kanji ?? []));
}

/** Recomputes the learned kanji from the stored progress (at start, after a quiz, after a restore). */
export async function refreshLearned(): Promise<void> {
  learnedKanji.value = kanjiOfCompleted(CURRICULUM, await allLessonProgress());
}
