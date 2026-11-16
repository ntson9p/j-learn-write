import type { GradeResult, Question } from './core/types.ts';
import { gradeJa } from './lang/ja/index.ts';

/**
 * Grades a learner answer. Dispatches on the question language; a new
 * language only needs its own pack under src/lang/<code>.
 */
export function grade(question: Question, answer: string): GradeResult {
  switch (question.lang) {
    case 'ja':
      return gradeJa(question, answer);
    default:
      throw new Error(`Unsupported language: ${String((question as { lang?: unknown }).lang)}`);
  }
}
