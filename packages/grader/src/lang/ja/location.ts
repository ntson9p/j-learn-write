/**
 * Grader for "where...?" questions (猫はどこにいますか).
 *
 * The answer's place phrases are found by position: N の P (机の上), or N
 * before に / です / で at the end (部屋にいます, 部屋です). The place and its
 * position word decide the content; a position put before the noun as in
 * Vietnamese (上の机) or a missing position cost points.
 */
import { clampScore, resolvePenalties, sortIssues, totalPenalty } from '../../core/scoring.ts';
import type { ContentStatus, GradeResult, Issue, LocationQuestion } from '../../core/types.ts';
import { nounNumbers } from './count.ts';
import { JA_DEFAULT_PENALTIES, jaIssue } from './issues.ts';
import { hasJapanese } from './kana.ts';
import type { Analysis, JaLexicon } from './lexicon.ts';
import { vi } from './messages.ts';
import { normalizeJa } from './normalize.ts';
import { ruleLists, runJaRules } from './rules.ts';
import { tokenize, type Token } from './tokenize.ts';
import { graderLexicon } from './words.ts';

const DEFAULT_WRONG_CONTENT_SCORE = 20;
/** Negated forms of a predicate (not ないで, なくて, なければ: those are clauses). */
const NEGATED = /(^|\+)(?:masu\+neg(?:\+past)?|nai(?:\+past)?|neg(?:\+past)?)$/u;
/** Position words of the course (机の上, 駅の前…). */
const POSITIONS = ['上', '下', '中', '前', '後ろ', '隣', '横', '近く', '外', '右', '左', '間', '向こう'];

type WordAnalysis = Extract<Analysis, { kind: 'word' }>;
const wordsOf = (t: Token | undefined): WordAnalysis[] => (t ? t.analyses.filter((a): a is WordAnalysis => a.kind === 'word') : []);
const fn = (t: Token | undefined, ...ids: string[]) => !!t && t.analyses.some((a) => a.kind === 'function' && ids.includes(a.id));
const isNoun = (t: Token | undefined) => wordsOf(t).some((a) => a.pos.includes('n') || a.pos.includes('pn')) || !!t?.analyses.some((a) => a.kind === 'name');

interface Place {
  place: Token;
  position?: Token;
  start: number;
  end: number;
}

export function gradeJaLocation(q: LocationQuestion, answer: string, lexicon: JaLexicon = graderLexicon()): GradeResult {
  const penalties = resolvePenalties(JA_DEFAULT_PENALTIES, q.penalties);
  const { text, hasLatin } = normalizeJa(answer);
  const base = { normalized: text, ...(q.expected.sentence ? { suggestion: q.expected.sentence } : {}) };
  if (!hasJapanese(text)) {
    return { ...base, score: 0, content: { status: 'no_answer', message: text ? (hasLatin ? vi.latin : vi.notJapanese) : vi.empty }, issues: [], needsReview: false };
  }
  const lists = ruleLists(lexicon);
  const positionNos = new Set(lexicon.words.filter((w) => POSITIONS.includes(w.word)).map((w) => w.no));
  const isPosition = (t: Token | undefined) => wordsOf(t).some((a) => positionNos.has(a.no));
  const tokens = tokenize(text, lexicon);
  const issues: Issue[] = runJaRules(text, lexicon, penalties);

  const places: Place[] = [];
  let negated = false;
  const asksExistence = /に(?:あり|い)ますか|に(?:ある|いる)[の？]/u.test(q.prompt);
  tokens.forEach((t, i) => {
    // A negated predicate: 机の上にありません, レストランで食べませんでした, 学校ではありません.
    if (wordsOf(t).some((a) => NEGATED.test(a.tags.join('+'))) || fn(t, 'dewa-arimasen', 'dewa-arimasen-deshita')) negated = true;
    // Where a thing or a person is: に, not で (机の上であります).
    if (asksExistence && fn(t, 'de') && i > 0 && (isNoun(tokens[i - 1]) || isPosition(tokens[i - 1])) && wordsOf(tokens[i + 1]).some((a) => a.no === lists.aru || a.no === lists.iru)) {
      const fix = { start: t.start, end: t.end, replacement: 'に' };
      if (!issues.some((x) => x.code === 'ni_de' && x.start <= t.start && t.end <= x.end)) issues.push(jaIssue(penalties, 'ni_de', tokens[i - 1]!.start, t.end, vi.niDeExist(tokens[i - 1]!.surface, tokens[i + 1]!.surface), fix));
    }
    const next = tokens[i + 1];
    const after = tokens[i + 2];
    if (isPosition(t)) return;
    if (isNoun(t) && fn(next, 'no') && isPosition(after)) {
      places.push({ place: t, position: after!, start: t.start, end: after!.end });
    } else if (isNoun(t) && !fn(tokens[i - 1], 'no') && (fn(next, 'ni', 'desu', 'da', 'de') || !next || next.analyses.every((a) => a.kind === 'punct'))) {
      // A place followed by に/です (the subject before は/が is not a place).
      places.push({ place: t, start: t.start, end: t.end });
    }
  });
  tokens.forEach((t, i) => {
    const next = tokens[i + 1];
    const noun = tokens[i + 2];
    if (isPosition(t) && fn(next, 'no') && isNoun(noun) && !isPosition(noun)) {
      const right = `${noun!.surface}の${t.surface}`;
      const fix = { start: t.start, end: noun!.end, replacement: right };
      issues.push(jaIssue(penalties, 'position_order', t.start, noun!.end, vi.positionOrder(text.slice(t.start, noun!.end), right), fix));
      places.push({ place: noun!, position: t, start: t.start, end: noun!.end });
    }
  });

  const expectedPlaces = (q.expected.places ?? []).map((p) => nounNumbers(lexicon, p));
  const expectedPosition = q.expected.position ? nounNumbers(lexicon, q.expected.position) : undefined;
  const sameWord = (t: Token, nos: ReadonlySet<number>) => wordsOf(t).some((a) => nos.has(a.no));
  // Places are course words or names (東京).
  const matchesPlace = (p: Place) =>
    expectedPlaces.length === 0 || expectedPlaces.some((nos, k) => sameWord(p.place, nos) || p.place.surface === q.expected.places![k]);

  let status: ContentStatus;
  let message: string;
  const named = [...new Set(places.map((p) => p.place.surface + (p.position ? `の${p.position.surface}` : '')))];
  if (places.length === 0) {
    status = 'no_answer';
    message = vi.locationNone;
  } else if (negated) {
    status = 'wrong';
    message = vi.locationNegated;
  } else {
    const right = places.filter(matchesPlace);
    if (right.length === 0) {
      status = 'wrong';
      message = named.length > 1 ? vi.locationAmbiguous(named) : vi.locationWrong(named[0]!);
    } else if (expectedPosition && right.some((p) => p.position && !sameWord(p.position, expectedPosition))) {
      status = 'wrong';
      message = vi.locationWrong(named[0]!);
    } else {
      status = 'correct';
      message = vi.locationCorrect;
      const bare = right.find((p) => !p.position);
      if (expectedPosition && bare && !right.some((p) => p.position)) {
        const fix = { start: bare.end, end: bare.end, replacement: `の${q.expected.position}` };
        issues.push(jaIssue(penalties, 'missing_position', bare.start, bare.end, vi.missingPosition(bare.place.surface, q.expected.position!), fix));
      }
    }
  }

  const sorted = sortIssues(issues);
  const penalty = totalPenalty(sorted);
  const score =
    status === 'correct' ? clampScore(100 - penalty) : status === 'wrong' ? clampScore(Math.min(q.options?.wrongContentScore ?? DEFAULT_WRONG_CONTENT_SCORE, 100 - penalty)) : 0;
  return { ...base, score, content: { status, message }, issues: sorted, needsReview: false };
}
