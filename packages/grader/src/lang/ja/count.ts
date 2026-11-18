/**
 * Grader for "how many X are there?" questions (鉛筆は何本ありますか).
 *
 * 1. The rules run first; their fixes are applied (さんほん → さんぼん) so that
 *    quantities written with a slip are still read.
 * 2. The quantities are number + counter tokens (3本, さんぼん, 三つ) and bare
 *    numbers; counters of other measures (円, 時, 歳) are ignored.
 * 3. The claimed number decides the content; a bare number or a counter of
 *    another kind costs points.
 */
import { applyFixes } from '../../core/fixes.ts';
import { clampScore, resolvePenalties, sortIssues, totalPenalty } from '../../core/scoring.ts';
import type { ContentStatus, CountQuestion, GradeResult, Issue } from '../../core/types.ts';
import { JA_DEFAULT_PENALTIES, jaIssue } from './issues.ts';
import { hasJapanese } from './kana.ts';
import type { JaLexicon } from './lexicon.ts';
import { vi } from './messages.ts';
import { normalizeJa } from './normalize.ts';
import { ruleLists, runJaRules } from './rules.ts';
import { tokenize } from './tokenize.ts';
import { graderLexicon } from './words.ts';

const DEFAULT_WRONG_CONTENT_SCORE = 20;

/** Course word numbers of a noun written in any of its spellings. */
export function nounNumbers(lexicon: JaLexicon, noun: string): Set<number> {
  return new Set(lexicon.words.filter((w) => w.word === noun || w.forms.includes(noun)).map((w) => w.no));
}

export function gradeJaCount(q: CountQuestion, answer: string, lexicon: JaLexicon = graderLexicon()): GradeResult {
  const penalties = resolvePenalties(JA_DEFAULT_PENALTIES, q.penalties);
  const { text, hasLatin } = normalizeJa(answer);
  const lists = ruleLists(lexicon);
  const nouns = nounNumbers(lexicon, q.expected.noun);
  const listed = [...nouns].flatMap((no) => lists.counters.get(no) ?? []);
  const allowed = q.expected.counter ? [q.expected.counter] : listed;
  const counter = allowed[0] ?? 'つ';
  const suggestion = q.expected.sentence ?? `${q.expected.noun}は${q.expected.number}${counter}あります。`;
  const base = { normalized: text, suggestion };
  if (!hasJapanese(text) && !/\d/.test(text)) {
    return { ...base, score: 0, content: { status: 'no_answer', message: text ? (hasLatin ? vi.latin : vi.notJapanese) : vi.empty }, issues: [], needsReview: false };
  }

  const ruleIssues = runJaRules(text, lexicon, penalties);
  const fixed = applyFixes(text, ruleIssues.flatMap((i) => (i.fix && i.code === 'counter_reading' ? [i.fix] : [])));
  const at = (i: number) => fixed.toOriginal[i] ?? i;
  const tokens = tokenize(fixed.text, lexicon);
  const counting = new Set([...[...lists.counters.values()].flat(), 'つ', '個', ...allowed]);

  const quantities: { value: number; counter: string | null; start: number; end: number; surface: string }[] = [];
  let otherNoun: string | undefined;
  let negated = false;
  for (const t of tokens) {
    const counted = t.analyses.find((a) => a.kind === 'counted' && a.value !== null && counting.has(a.counter));
    const number = t.analyses.find((a) => a.kind === 'number');
    if (counted && counted.kind === 'counted') quantities.push({ value: counted.value!, counter: counted.counter, start: at(t.start), end: at(t.end), surface: t.surface });
    else if (number && number.kind === 'number' && !t.analyses.some((a) => a.kind === 'counted')) quantities.push({ value: number.value, counter: null, start: at(t.start), end: at(t.end), surface: t.surface });
    for (const a of t.analyses) {
      // 150円じゃありません, ではない: a negated copula.
      if (a.kind === 'function' && (a.id === 'dewa-arimasen' || a.id === 'dewa-arimasen-deshita')) negated = true;
      if (a.kind !== 'word') continue;
      if (!nouns.has(a.no) && lists.counters.has(a.no) && !otherNoun) otherNoun = t.surface;
      if ((a.no === lists.aru || a.no === lists.iru) && (a.tags.includes('neg') || a.tags.includes('nai'))) negated = true;
    }
  }

  const issues: Issue[] = [...ruleIssues];
  for (const qn of quantities) {
    if (qn.counter === null) {
      if (!issues.some((i) => i.code === 'missing_counter' && i.start <= qn.start && qn.start < i.end)) {
        const fix = { start: qn.end, end: qn.end, replacement: counter };
        issues.push(jaIssue(penalties, 'missing_counter', qn.start, qn.end, vi.missingCounterBare(qn.surface, counter), fix));
      }
    } else if (allowed.length > 0 && !allowed.includes(qn.counter) && !issues.some((i) => i.code === 'wrong_counter')) {
      const fix = { start: qn.end - qn.counter.length, end: qn.end, replacement: counter };
      issues.push(jaIssue(penalties, 'wrong_counter', qn.start, qn.end, vi.wrongCounter(q.expected.noun, counter, qn.counter), fix));
    }
  }

  let status: ContentStatus;
  let message: string;
  const values = [...new Set(quantities.map((x) => x.value))];
  if (quantities.length === 0) {
    status = otherNoun ? 'wrong' : 'no_answer';
    message = otherNoun ? vi.countOther(otherNoun, q.expected.noun) : vi.countNoNumber(q.expected.noun);
  } else if (negated) {
    status = 'wrong';
    message = vi.countNegated;
  } else if (values.length > 1) {
    status = 'wrong';
    message = vi.countAmbiguous(values);
  } else if (otherNoun && !tokens.some((t) => t.analyses.some((a) => a.kind === 'word' && nouns.has(a.no)))) {
    status = 'wrong';
    message = vi.countOther(otherNoun, q.expected.noun);
  } else if (values[0] !== q.expected.number) {
    status = 'wrong';
    message = vi.countWrong(values[0]!);
  } else {
    status = 'correct';
    message = vi.countCorrect;
  }

  const sorted = sortIssues(issues);
  const penalty = totalPenalty(sorted);
  const score =
    status === 'correct' ? clampScore(100 - penalty) : status === 'wrong' ? clampScore(Math.min(q.options?.wrongContentScore ?? DEFAULT_WRONG_CONTENT_SCORE, 100 - penalty)) : 0;
  const result: GradeResult = { ...base, score, content: { status, message }, issues: sorted, needsReview: false };
  if (status === 'correct' && penalty > 0) {
    const fixedAll = applyFixes(text, sorted.flatMap((i) => (i.fix ? [i.fix] : [])));
    result.corrected = fixedAll.text;
  }
  return result;
}
