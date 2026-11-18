/** The grader questions of the free-answer exercises (used by the app and by the content checks). */
import type { ModelQuestion, Question } from '@j-learn-write/grader';
import type { Exercise } from './types.ts';

/** The grader question of a translate exercise. */
export function translateQuestion(ex: Extract<Exercise, { type: 'translate' }>): ModelQuestion {
  return { id: ex.id, lang: 'ja', type: 'model', prompt: ex.vi, promptVi: ex.vi, answers: ex.answers, ...(ex.examples ? { examples: ex.examples } : {}) };
}

/** The grader question of a question exercise. */
export function exerciseQuestion(ex: Extract<Exercise, { type: 'question' }>): Question {
  return { ...ex.question, id: ex.id, lang: 'ja' } as Question;
}
