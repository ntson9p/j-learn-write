/**
 * Lesson progress: started, exercises done, quiz score, completion. A lesson
 * opens when the previous one is completed (quiz ≥ PASS_MARK), or when the
 * learner chooses to skip ahead ("học vượt").
 */
import { db, type ExerciseRecord, type LessonProgress } from './db';

export const PASS_MARK = 80;

export async function allLessonProgress(): Promise<Map<string, LessonProgress>> {
  const list = await (await db()).getAll('lessons');
  return new Map(list.map((p) => [p.lessonId, p]));
}

export async function getLessonProgress(lessonId: string): Promise<LessonProgress | undefined> {
  return (await db()).get('lessons', lessonId);
}

/** Marks a lesson as started (also how "học vượt" unlocks it). */
export async function startLesson(lessonId: string, now: Date): Promise<LessonProgress> {
  const database = await db();
  const existing = await database.get('lessons', lessonId);
  if (existing) return existing;
  const p: LessonProgress = { lessonId, startedAt: now.getTime(), completedAt: null, bestScore: 0, exercises: {} };
  await database.put('lessons', p);
  return p;
}

export async function recordExercise(lessonId: string, exerciseId: string, rec: ExerciseRecord, now: Date): Promise<void> {
  const database = await db();
  const tx = database.transaction('lessons', 'readwrite');
  const p = (await tx.store.get(lessonId)) ?? { lessonId, startedAt: now.getTime(), completedAt: null, bestScore: 0, exercises: {} };
  p.exercises[exerciseId] = rec;
  await tx.store.put(p);
  await tx.done;
}

/** Records a lesson-quiz score; the lesson is completed at PASS_MARK or more. */
export async function recordQuiz(lessonId: string, score: number, now: Date): Promise<LessonProgress> {
  const database = await db();
  const tx = database.transaction('lessons', 'readwrite');
  const p = (await tx.store.get(lessonId)) ?? { lessonId, startedAt: now.getTime(), completedAt: null, bestScore: 0, exercises: {} };
  p.bestScore = Math.max(p.bestScore, score);
  if (score >= PASS_MARK && p.completedAt === null) p.completedAt = now.getTime();
  await tx.store.put(p);
  await tx.done;
  return p;
}

export type LessonState = 'writing' | 'locked' | 'open' | 'started' | 'completed';

/** State of each lesson of a level, in order (pure). */
export function lessonStates(
  lessons: readonly { id: string; hasContent: boolean }[],
  progress: ReadonlyMap<string, LessonProgress>,
): LessonState[] {
  return lessons.map((l, i) => {
    if (!l.hasContent) return 'writing';
    const p = progress.get(l.id);
    if (p?.completedAt) return 'completed';
    if (p) return 'started';
    const prev = lessons[i - 1];
    if (i === 0 || !prev || progress.get(prev.id)?.completedAt || !prev.hasContent) return 'open';
    return 'locked';
  });
}
