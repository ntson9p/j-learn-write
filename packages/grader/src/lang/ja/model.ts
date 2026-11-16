/**
 * Grader for closed questions with a list of accepted (model) answers.
 *
 * 1. The answer and each model answer are cut into units (tokens of the
 *    course lexicon). Units are equal when they share an analysis: 私 =
 *    わたし, 食べます = たべます, so an answer written all in kana matches.
 * 2. The rules run on the answer; their fixes are applied and the result is
 *    compared again.
 * 3. The comparison is an alignment that tolerates, with a penalty: a
 *    missing or extra particle or copula, a homophone kanji (雨/飴), a kana
 *    slip (がこう/がっこう), hiragana for katakana, plain for polite style;
 *    and a changed particle (に/で), marked for a teacher's review. It never
 *    tolerates other changes: tense, negation, numbers, other words, か, も.
 * 4. An answer in kana that sounds exactly like a model answer but writes a
 *    particle as it sounds (わたしわ) gets a particle_kana issue.
 * 5. When the whole answer does not match, each sentence is tried: an answer
 *    with extra information is accepted but marked for review.
 */
import { align, type AlignCosts } from '../../core/align.ts';
import { applyFixes } from '../../core/fixes.ts';
import { expandPattern } from '../../core/patterns.ts';
import { clampScore, resolvePenalties, sortIssues, totalPenalty } from '../../core/scoring.ts';
import type { Fix, GradeResult, Issue, ModelQuestion } from '../../core/types.ts';
import { JA_DEFAULT_PENALTIES, jaIssue, type JaIssueCode } from './issues.ts';
import { hasJapanese, isKanji, toHiragana, toKatakana } from './kana.ts';
import type { JaLexicon } from './lexicon.ts';
import { vi } from './messages.ts';
import { normalizeJa } from './normalize.ts';
import { renderedMatch } from './render.ts';
import { runJaRules } from './rules.ts';
import { tokenize } from './tokenize.ts';
import { joinPredicates, politenessPair, shareKey, shareLemma, shareReading, spellingSlip, unitsOf, type Unit } from './units.ts';
import { graderLexicon } from './words.ts';

type Penalties = Readonly<Record<string, number>>;

const LEADING_INTERJECTIONS = new Set(['f:etto', 'f:anou']);
/** Sentence-final particles: ignored at the end of an answer unless the model answer ends with one. */
const FINAL_PARTICLES = new Set(['ね', 'よ', 'よね']);
const COPULAS = new Set(['f:desu', 'f:deshita', 'f:deshou', 'f:da', 'f:datta', 'f:darou']);

/**
 * Units ready to compare: predicates joined (高くないです = 高くありません), leading
 * interjections dropped, and の before a copula or at the end made critical
 * (この傘はナムさんのです: without の it says "is Nam").
 */
function prepare(units: readonly Unit[]): Unit[] {
  const out = joinPredicates(units);
  while (out.length > 1 && out[0]!.lemmas.size > 0 && [...out[0]!.lemmas].every((l) => LEADING_INTERJECTIONS.has(l))) out.shift();
  return out.map((u, i) => {
    if (!u.lemmas.has('f:no') || !u.particle) return u;
    const next = out[i + 1];
    const nominal = !next || [...next.lemmas].some((l) => COPULAS.has(l) || l === 'f:ka') || FINAL_PARTICLES.has(next.surface);
    return nominal ? { ...u, critical: true } : u;
  });
}

/**
 * A plain question ends with ？ instead of か (行く？ = 行きますか): the question
 * mark counts as か, so that the statement 行く。 is not taken for the question.
 */
function withQuestionMark(units: Unit[], text: string): Unit[] {
  const last = units[units.length - 1];
  if (!last || !/[？?]\s*$/u.test(text) || last.lemmas.has('f:ka')) return units;
  const end = text.length;
  const ka: Unit = {
    surface: '？', start: end - 1, end, keys: new Set(['f:ka:']), lemmas: new Set(['f:ka']), forms: new Map([['f:ka', [[]]]]), readings: new Set(['か']),
    kana: false, hasKanji: false, isWord: false, particle: true, copula: false, unknown: false, critical: true, noSwap: false, kinds: new Map(),
  };
  return [...units, ka];
}

/** Without trailing ね/よ (they do not change the answer). */
function stripFinal(units: readonly Unit[]): Unit[] {
  const out = [...units];
  while (out.length > 1 && FINAL_PARTICLES.has(out[out.length - 1]!.surface)) out.pop();
  return out;
}

/** An answer's units, with and without its trailing ね/よ. */
interface AnswerUnits {
  full: Unit[];
  stripped: Unit[];
}

const answerUnits = (units: readonly Unit[], text: string): AnswerUnits => {
  const full = withQuestionMark(prepare(units), text);
  return { full, stripped: stripFinal(full) };
};

/** Particles and copulas may be missing or extra (at a cost); は counts as a particle although it is also 歯 in kana. */
const isLight = (u: Unit) => (u.particle || (u.copula && !u.isWord)) && !u.critical;

type EditType = 'particle' | 'politeness' | 'homophone' | 'spelling' | 'script';

function substitution(a: Unit, b: Unit): EditType | null {
  if (a.particle && b.particle && !a.critical && !b.critical && !a.noSwap && !b.noSwap) return 'particle';
  if (politenessPair(a, b)) return 'politeness';
  if (shareLemma(a, b)) return null; // the same word in another form: tense, negation… changes the meaning
  if (shareReading(a, b)) {
    if (a.hasKanji && b.hasKanji) return 'homophone';
    if (a.kana && b.kana && !a.isWord) return 'script';
  }
  if (!a.isWord && a.kana && [...a.readings].some((x) => [...b.readings].some((y) => spellingSlip(x, y)))) return 'spelling';
  return null;
}

const SUB_COST: Record<EditType, number> = { particle: 0.5, politeness: 0.2, homophone: 0.3, spelling: 0.4, script: 0.2 };

const COSTS: AlignCosts<Unit, Unit> = {
  equal: shareKey,
  substitute: (a, b) => {
    const t = substitution(a, b);
    return t ? SUB_COST[t] : 1;
  },
  extra: (a) => (isLight(a) ? 0.9 : 1),
  missing: (b) => (isLight(b) ? 0.9 : 1),
};

const MOVEMENT = ['行く', '来る', '帰る'];

const isVerbStem = (u: Unit) => [...u.kinds].some(([lemma, kind]) => kind !== 'adj' && u.forms.get(lemma)?.some((t) => t.join('+') === 'stem'));
const isPredicate = (u: Unit) => u.copula || [...u.kinds].some(([lemma]) => u.forms.get(lemma)?.some((t) => !t.includes('stem') && !t.includes('te') && !t.includes('ku')));
const withKeys = (u: Unit, ...lemmas: string[]): Unit => ({ ...u, keys: new Set([...u.keys, ...lemmas.map((l) => `${l}:`)]), lemmas: new Set([...u.lemmas, ...lemmas]) });

/**
 * Particles that mean the same here, either accepted:
 * - に and へ after a place before a verb of movement (学校に行きます = 学校へ行きます),
 *   not after a verb stem (買いに行きます: purpose, へ is wrong);
 * - から and ので after a predicate (reason: 雨が降ったから = 雨が降ったので).
 */
function withEquivalentParticles(units: Unit[], lexicon: JaLexicon): Unit[] {
  const movement = new Set(lexicon.words.filter((w) => MOVEMENT.includes(w.word)).map((w) => `w${w.no}`));
  return units.map((u, i) => {
    const prev = units[i - 1];
    const next = units[i + 1];
    if ((u.lemmas.has('f:kara') || u.lemmas.has('f:node')) && prev && isPredicate(prev)) return withKeys(u, 'f:kara', 'f:node');
    if (!next || ![...next.lemmas].some((l) => movement.has(l))) return u;
    if (!u.lemmas.has('f:ni') && !u.lemmas.has('f:e')) return u;
    if (prev && isVerbStem(prev)) return u;
    return withKeys(u, 'f:ni', 'f:e');
  });
}

/**
 * Katakana words typed in hiragana (こーひー, めーる): a stretch of hiragana with
 * ー whose katakana spelling is a known word is turned into katakana; the
 * positions are kept.
 */
function katakanaRuns(text: string, lexicon: JaLexicon): { text: string; runs: { start: number; end: number }[] } {
  const runs: { start: number; end: number }[] = [];
  const chars = [...text];
  const hira = (c: string | undefined) => !!c && /[ぁ-ゖー]/u.test(c);
  let out = '';
  for (let i = 0; i < chars.length; ) {
    let done = false;
    if (/[ぁ-ゖ]/u.test(chars[i]!)) {
      let runEnd = i;
      while (hira(chars[runEnd])) runEnd++;
      for (let end = runEnd; end > i + 1 && !done; end--) {
        const piece = chars.slice(i, end).join('');
        if (!piece.includes('ー')) break;
        const kata = toKatakana(piece);
        if (lexicon.analyses(kata).length === 0) continue;
        runs.push({ start: out.length, end: out.length + piece.length });
        out += kata;
        i = end;
        done = true;
      }
    }
    if (!done) out += chars[i++]!;
  }
  return { text: out, runs };
}

interface ModelEntry {
  display: string;
  text: string;
  units: Unit[];
  score: number;
  /** Ends with ね/よ: compared with the answer's own ending. */
  final: boolean;
}

type Edit =
  | { type: EditType; unit: Unit; expected: Unit }
  | { type: 'extra'; unit: Unit }
  | { type: 'missing'; unit: Unit; at: number };

interface Candidate {
  model: ModelEntry;
  cost: number;
  acceptable: boolean;
  /** One meaning-changing edit away from acceptable: worth a teacher's look. */
  close: boolean;
  edits: Edit[];
}

const modelCache = new WeakMap<ModelQuestion, ModelEntry[]>();

function modelsOf(q: ModelQuestion, lexicon: JaLexicon): ModelEntry[] {
  const cached = modelCache.get(q);
  if (cached) return cached;
  const byText = new Map<string, ModelEntry>();
  for (const answer of q.answers) {
    const spec = typeof answer === 'string' ? { text: answer } : answer;
    const score = spec.score ?? 100;
    for (const display of expandPattern(spec.text)) {
      const text = normalizeJa(display).text;
      const units = withEquivalentParticles(withQuestionMark(prepare(unitsOf(text, lexicon)), text), lexicon);
      if (units.length === 0) continue;
      const final = units.length > 1 && FINAL_PARTICLES.has(units[units.length - 1]!.surface);
      const previous = byText.get(text);
      if (!previous || previous.score < score) byText.set(text, { display, text, units, score, final });
    }
  }
  const entries = [...byText.values()];
  modelCache.set(q, entries);
  return entries;
}

function evaluate(answer: readonly Unit[], model: ModelEntry, maxLight: number | undefined): Candidate {
  const { cost, ops } = align(answer, model.units, COSTS);
  const edits: Edit[] = [];
  let bad = 0;
  let badCritical = 0;
  let light = 0;
  let typos = 0;
  ops.forEach((op, index) => {
    if (op.kind === 'substitute') {
      const t = substitution(op.a, op.b);
      if (t) {
        edits.push({ type: t, unit: op.a, expected: op.b });
        if (t === 'homophone' || t === 'spelling' || t === 'script') typos++;
        if (t === 'particle') light++;
      } else {
        bad++;
        if (op.a.critical || op.b.critical) badCritical++;
      }
    } else if (op.kind === 'extra') {
      if (isLight(op.a)) {
        light++;
        edits.push({ type: 'extra', unit: op.a });
      } else {
        bad++;
        if (op.a.critical) badCritical++;
      }
    } else if (op.kind === 'missing') {
      const nextOp = ops.slice(index + 1).find((o) => o.kind !== 'missing');
      // 何？ for 何ですか: a plain question drops です (a politeness remark, no penalty).
      if (op.b.lemmas.has('f:desu') && nextOp && 'a' in nextOp && nextOp.a.surface === '？') {
        edits.push({ type: 'politeness', unit: nextOp.a, expected: op.b });
        return;
      }
      if (isLight(op.b)) {
        light++;
        const next = ops.slice(index + 1).find((o) => o.kind !== 'missing');
        const at = next && 'a' in next ? next.a.start : (answer[answer.length - 1]?.end ?? 0);
        edits.push({ type: 'missing', unit: op.b, at });
      } else {
        bad++;
        if (op.b.critical) badCritical++;
      }
    }
  });
  const allowedLight = maxLight ?? (model.units.length <= 4 ? 1 : 2);
  const allowedTypos = Math.max(1, Math.floor(model.units.length / 3));
  const withinLimits = light <= allowedLight && typos <= allowedTypos;
  return {
    model,
    cost,
    acceptable: bad === 0 && withinLimits,
    close: bad === 1 && badCritical === 0 && withinLimits && model.units.length >= 2,
    edits,
  };
}

const EDIT_CODE: Record<Edit['type'], JaIssueCode> = {
  particle: 'wrong_particle',
  politeness: 'politeness_mix',
  homophone: 'homophone_kanji',
  spelling: 'kana_spelling',
  script: 'kana_script',
  extra: 'extra_word',
  missing: 'missing_word',
};

function editIssues(edits: readonly Edit[], penalties: Penalties, pos: (i: number) => number): Issue[] {
  const issues: Issue[] = [];
  let politeness = false;
  for (const e of edits) {
    const code = EDIT_CODE[e.type];
    if (e.type === 'extra') {
      const fix: Fix = { start: pos(e.unit.start), end: pos(e.unit.end), replacement: '' };
      issues.push(jaIssue(penalties, code, fix.start, fix.end, vi.extraWord(e.unit.surface), fix));
    } else if (e.type === 'missing') {
      const fix: Fix = { start: pos(e.at), end: pos(e.at), replacement: e.unit.surface };
      issues.push(jaIssue(penalties, code, fix.start, fix.end, vi.missingWord(e.unit.surface), fix));
    } else {
      const fix: Fix = { start: pos(e.unit.start), end: pos(e.unit.end), replacement: e.expected.surface };
      if (e.type === 'politeness') {
        // One remark for the whole answer.
        if (politeness) continue;
        politeness = true;
        issues.push(jaIssue(penalties, code, fix.start, fix.end, vi.politeness));
        continue;
      }
      const message =
        e.type === 'particle'
          ? vi.wrongParticle(e.unit.surface, e.expected.surface)
          : e.type === 'homophone'
            ? vi.homophoneKanji(e.unit.surface, e.expected.surface)
            : e.type === 'spelling'
              ? vi.kanaSpelling(e.unit.surface, e.expected.surface)
              : vi.kanaScript(e.unit.surface, e.expected.surface);
      issues.push(jaIssue(penalties, code, fix.start, fix.end, message, fix));
    }
  }
  return issues;
}

function compare(answer: AnswerUnits, models: readonly ModelEntry[], q: ModelQuestion, penalties: Penalties) {
  const candidates = models.map((m) => evaluate(m.final ? answer.full : answer.stripped, m, q.options?.maxLightEdits));
  const value = (c: Candidate) => c.model.score - editIssues(c.edits, penalties, (i) => i).reduce((s, i) => s + i.penalty, 0);
  const best = candidates.filter((c) => c.acceptable).sort((x, y) => value(y) - value(x) || x.cost - y.cost)[0];
  const closest = [...candidates].sort((x, y) => x.cost - y.cost || y.model.score - x.model.score)[0];
  return { best, closest };
}

// ---------------------------------------------------------------- answers in kana, compared by sound

/** Up to `limit` hiragana spellings of a text: kana as written, other tokens by each of their readings. */
function spellings(text: string, lexicon: JaLexicon, mode: 'written' | 'spoken', limit = 32): { kana: string; map: number[] }[] {
  let out: { kana: string; map: number[] }[] = [{ kana: '', map: [] }];
  for (const t of tokenize(text, lexicon)) {
    if (t.analyses.every((a) => a.kind === 'punct')) continue;
    const written = toHiragana(t.surface);
    let options: string[];
    if (![...t.surface].some(isKanji) && mode === 'written') options = [written];
    else {
      const readings = new Set(t.analyses.flatMap((a) => ('reading' in a ? [toHiragana(a.reading)] : [])));
      if (mode === 'written' || readings.size === 0) readings.add(written);
      options = [...readings];
    }
    const next: { kana: string; map: number[] }[] = [];
    for (const prefix of out) {
      for (const o of options) {
        if (next.length >= limit) break;
        next.push({ kana: prefix.kana + o, map: [...prefix.map, ...[...o].map((_, i) => (o === written ? t.start + i : t.start))] });
      }
    }
    out = next;
  }
  return out;
}

const PARTICLE_SOUND: Record<string, { right: string; sound: string }> = { わ: { right: 'は', sound: 'wa' }, お: { right: 'を', sound: 'o' }, え: { right: 'へ', sound: 'e' } };

/**
 * An answer without kanji that sounds like a model answer: particles written
 * as they sound (わたしわ) or one kana slip (がこう). Null when it is not one.
 */
function bySound(text: string, model: ModelEntry, lexicon: JaLexicon, penalties: Penalties): Issue[] | null {
  if ([...text].some(isKanji)) return null;
  const answer = toHiragana(text.replace(/[\p{P}\p{S}]/gu, ''));
  const answerMap = [...text].flatMap((c, i) => (/[\p{P}\p{S}]/u.test(c) ? [] : [i]));
  for (const spoken of spellings(model.text, lexicon, 'spoken')) {
    for (const written of spellings(model.text, lexicon, 'written')) {
      if (spoken.kana.length !== written.kana.length) continue;
      // Same sound: report the particles written as they sound.
      if (answer === spoken.kana && answer !== written.kana) {
        const issues: Issue[] = [];
        for (let i = 0; i < answer.length; i++) {
          const w = written.kana[i]!;
          const a = answer[i]!;
          if (w === a) continue;
          const p = PARTICLE_SOUND[a];
          if (!p || p.right !== w) return null;
          const at = answerMap[i]!;
          issues.push(jaIssue(penalties, 'particle_kana', at, at + 1, vi.particleKana(a, w, p.sound), { start: at, end: at + 1, replacement: w }));
        }
        return issues;
      }
    }
    if (spellingSlip(answer, spoken.kana)) {
      return [jaIssue(penalties, 'kana_spelling', 0, text.length, vi.kanaSpelling(text, model.display))];
    }
  }
  for (const written of spellings(model.text, lexicon, 'written')) {
    if (spellingSlip(answer, written.kana)) return [jaIssue(penalties, 'kana_spelling', 0, text.length, vi.kanaSpelling(text, model.display))];
  }
  return null;
}

// ---------------------------------------------------------------- matching

const shiftIssue = (i: Issue, by: number): Issue => ({ ...i, start: i.start + by, end: i.end + by, ...(i.fix ? { fix: { ...i.fix, start: i.fix.start + by, end: i.fix.end + by } } : {}) });

type MatchKind = 'exact' | 'rendered' | 'fixed' | 'plain' | 'sound';

interface Match {
  kind: MatchKind;
  model: ModelEntry;
  edits: Issue[];
  start: number;
  end: number;
}

function attempt(
  text: string,
  start: number,
  end: number,
  ruleIssues: readonly Issue[],
  models: readonly ModelEntry[],
  q: ModelQuestion,
  penalties: Penalties,
  lexicon: JaLexicon,
): { match?: Match; closest?: Candidate } {
  const sub = text.slice(start, end);
  const shift = (u: Unit): Unit => ({ ...u, start: u.start + start, end: u.end + start });
  const shifted = answerUnits(unitsOf(sub, lexicon).map(shift), text.slice(0, end));
  if (shifted.full.length === 0) return {};

  const plain = compare(shifted, models, q, penalties);
  if (plain.best && plain.best.edits.length === 0) return { match: { kind: 'exact', model: plain.best.model, edits: [], start, end } };

  // The model answer written partly or wholly in kana (whatever the tokenizer makes of it).
  let rendered: Match | undefined;
  for (const m of models) {
    const issues = renderedMatch(sub, m.text, lexicon, penalties);
    if (!issues) continue;
    const found: Match = { kind: 'rendered', model: m, edits: issues.map((i) => shiftIssue(i, start)), start, end };
    if (!rendered || matchValue(found) > matchValue(rendered)) rendered = found;
  }
  if (rendered) return { match: rendered };

  const localFixes: Fix[] = ruleIssues.flatMap((i) =>
    i.fix && i.fix.start >= start && i.fix.end <= end ? [{ ...i.fix, start: i.fix.start - start, end: i.fix.end - start }] : [],
  );
  if (localFixes.length > 0) {
    const fixed = applyFixes(sub, localFixes);
    const viaFixes = compare(answerUnits(unitsOf(fixed.text, lexicon), fixed.text), models, q, penalties);
    if (viaFixes.best) {
      const map = fixed.toOriginal;
      const edits = editIssues(viaFixes.best.edits, penalties, (i) => (map[i] ?? i) + start);
      return { match: { kind: 'fixed', model: viaFixes.best.model, edits, start, end }, closest: viaFixes.closest };
    }
  }
  if (plain.best) {
    return { match: { kind: 'plain', model: plain.best.model, edits: editIssues(plain.best.edits, penalties, (i) => i), start, end }, closest: plain.closest };
  }
  for (const m of models) {
    const sound = bySound(sub, m, lexicon, penalties);
    if (sound) return { match: { kind: 'sound', model: m, edits: sound.map((i) => shiftIssue(i, start)), start, end } };
  }
  return plain.closest ? { closest: plain.closest } : {};
}

const overlaps = (a: Issue, b: Issue) => a.start <= b.end && b.start <= a.end;

function matchIssues(match: Match, ruleIssues: readonly Issue[]): Issue[] {
  switch (match.kind) {
    case 'exact':
    case 'rendered':
      // The matched part is a model answer: rule findings inside it are not mistakes,
      // except a counter read without its sound change (きゅうじ for 9時: same quantity).
      return [...ruleIssues.filter((r) => r.end <= match.start || r.start >= match.end || r.code === 'counter_reading'), ...match.edits];
    case 'fixed':
      return [...ruleIssues, ...match.edits];
    case 'plain':
    case 'sound':
      return [...ruleIssues.filter((r) => !match.edits.some((e) => overlaps(r, e))), ...match.edits];
  }
}

const matchValue = (m: Match) => m.model.score - m.edits.reduce((sum, e) => sum + e.penalty, 0);

/** Sentences of an answer (split after 。！？). */
function sentences(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let start = 0;
  for (const m of text.matchAll(/[。！？]+/gu)) {
    out.push({ start, end: m.index! + m[0].length });
    start = m.index! + m[0].length;
  }
  if (start < text.length) out.push({ start, end: text.length });
  return out;
}

export function gradeJaModel(q: ModelQuestion, answer: string, lexicon: JaLexicon = graderLexicon()): GradeResult {
  const penalties = resolvePenalties(JA_DEFAULT_PENALTIES, q.penalties);
  const normalized = normalizeJa(answer);
  const hasLatin = normalized.hasLatin;
  // こーひー → コーヒー (reported below as kana_script).
  const { text, runs: katakanaFixed } = katakanaRuns(normalized.text, lexicon);
  const models = modelsOf(q, lexicon);
  const suggestion = models[0]?.display;
  if (!hasJapanese(text)) {
    return {
      score: 0,
      content: { status: 'no_answer', message: text.length === 0 ? vi.empty : hasLatin ? vi.latin : vi.notJapanese },
      issues: [],
      normalized: normalized.text,
      ...(suggestion ? { suggestion } : {}),
      needsReview: false,
    };
  }

  const ruleIssues = runJaRules(text, lexicon, penalties);
  const scriptIssues = katakanaFixed.map((r) => {
    const written = normalized.text.slice(r.start, r.end);
    const right = text.slice(r.start, r.end);
    return jaIssue(penalties, 'kana_script', r.start, r.end, vi.kanaScript(written, right), { start: r.start, end: r.end, replacement: right });
  });
  const whole = attempt(text, 0, text.length, ruleIssues, models, q, penalties, lexicon);
  let match = whole.match;
  let partial = false;
  if (!match) {
    const parts = sentences(text);
    if (parts.length > 1) {
      for (const part of parts) {
        const found = attempt(text, part.start, part.end, ruleIssues, models, q, penalties, lexicon).match;
        if (found && (!match || matchValue(found) > matchValue(match))) match = found;
      }
      partial = match !== undefined;
    }
  }

  if (match) {
    const issues = sortIssues([...scriptIssues, ...matchIssues(match, ruleIssues)]);
    const score = clampScore(match.model.score - totalPenalty(issues));
    const review = partial || issues.some((i) => i.code === 'wrong_particle');
    const result: GradeResult = {
      score,
      content: { status: 'correct', message: partial ? vi.modelPartial : score === 100 ? vi.perfect : vi.modelCorrect },
      issues,
      normalized: normalized.text,
      needsReview: review,
      details: { matched: match.model.display, matchedPart: text.slice(match.start, match.end) },
    };
    if (issues.some((i) => i.penalty > 0)) result.corrected = partial ? text.slice(0, match.start) + match.model.display + text.slice(match.end) : match.model.display;
    return result;
  }

  const close = whole.closest?.close ?? false;
  return {
    score: 0,
    content: { status: 'unmatched', message: close ? vi.modelClose : vi.modelUnmatched },
    issues: sortIssues([...scriptIssues, ...ruleIssues]),
    normalized: normalized.text,
    ...((whole.closest?.model.display ?? suggestion) ? { suggestion: whole.closest?.model.display ?? suggestion! } : {}),
    needsReview: close,
    details: { closest: whole.closest?.model.display ?? null },
  };
}
