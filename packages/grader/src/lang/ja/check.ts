/**
 * Runs the language rules on one sentence, outside of any question: used for
 * word-order exercises (to explain a wrong order) and to check that correct
 * course sentences raise no issue at all.
 */
import { resolvePenalties } from '../../core/scoring.ts';
import type { Issue } from '../../core/types.ts';
import { JA_DEFAULT_PENALTIES } from './issues.ts';
import type { JaLexicon } from './lexicon.ts';
import { normalizeJa } from './normalize.ts';
import { runJaRules } from './rules.ts';
import { graderLexicon } from './words.ts';

export interface SentenceCheck {
  /** The normalized sentence; issue spans refer to it. */
  normalized: string;
  issues: Issue[];
}

export function checkJaSentence(text: string, lexicon: JaLexicon = graderLexicon()): SentenceCheck {
  const { text: normalized } = normalizeJa(text);
  return { normalized, issues: runJaRules(normalized, lexicon, resolvePenalties(JA_DEFAULT_PENALTIES, undefined)) };
}
