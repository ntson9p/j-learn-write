import type { GradeResult, Question } from '../../core/types.ts';
import { gradeJaCount } from './count.ts';
import { gradeJaLocation } from './location.ts';
import { gradeJaModel } from './model.ts';

export { JA_DEFAULT_PENALTIES, JA_ISSUE_LABELS_VI, type JaIssueCode } from './issues.ts';
export { gradeJaModel } from './model.ts';
export { gradeJaCount } from './count.ts';
export { gradeJaLocation } from './location.ts';
export { checkJaSentence, type SentenceCheck } from './check.ts';

/** Grades an answer to a Japanese question. */
export function gradeJa(question: Question, answer: string): GradeResult {
  switch (question.type) {
    case 'model':
      return gradeJaModel(question, answer);
    case 'count':
      return gradeJaCount(question, answer);
    case 'location':
      return gradeJaLocation(question, answer);
  }
}
