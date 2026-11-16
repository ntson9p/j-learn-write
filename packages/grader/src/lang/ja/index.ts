import type { GradeResult, Question } from '../../core/types.ts';
import { gradeJaModel } from './model.ts';

export { JA_DEFAULT_PENALTIES, JA_ISSUE_LABELS_VI, type JaIssueCode } from './issues.ts';
export { gradeJaModel } from './model.ts';
export { checkJaSentence, type SentenceCheck } from './check.ts';

/** Grades an answer to a Japanese question. */
export function gradeJa(question: Question, answer: string): GradeResult {
  switch (question.type) {
    case 'model':
      return gradeJaModel(question, answer);
    default:
      throw new Error(`question type ${question.type} is not graded yet`);
  }
}
