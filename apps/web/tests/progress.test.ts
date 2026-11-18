import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll } from '../src/lib/db';
import type { LessonProgress } from '../src/lib/db';
import { allLessonProgress, lessonStates, recordExercise, recordQuiz, startLesson } from '../src/lib/progress';

const now = new Date('2026-11-15T08:00:00Z');

describe('lesson progress', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('records start, exercises and the best quiz score', async () => {
    await startLesson('n5-01', now);
    await recordExercise('n5-01', 'n5-01-e01', { correct: true, score: 100, at: 1 }, now);
    let p = await recordQuiz('n5-01', 60, now);
    expect(p.completedAt).toBeNull();
    p = await recordQuiz('n5-01', 85, now);
    expect(p).toMatchObject({ bestScore: 85, completedAt: now.getTime() });
    p = await recordQuiz('n5-01', 70, now);
    expect(p.bestScore).toBe(85);
    expect((await allLessonProgress()).get('n5-01')?.exercises['n5-01-e01']?.correct).toBe(true);
  });

  it('opens a lesson after the previous one is completed or when started', () => {
    const lessons = [
      { id: 'a', hasContent: true },
      { id: 'b', hasContent: true },
      { id: 'c', hasContent: true },
      { id: 'd', hasContent: false },
    ];
    expect(lessonStates(lessons, new Map())).toEqual(['open', 'locked', 'locked', 'writing']);
    const done: LessonProgress = { lessonId: 'a', startedAt: 1, completedAt: 2, bestScore: 90, exercises: {} };
    const skipped: LessonProgress = { lessonId: 'c', startedAt: 1, completedAt: null, bestScore: 0, exercises: {} };
    expect(lessonStates(lessons, new Map([['a', done], ['c', skipped]]))).toEqual(['completed', 'open', 'started', 'writing']);
  });
});
