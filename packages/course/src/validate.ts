/**
 * Content checks run by `npm run check` (tests/content.test.ts): curriculum
 * structure and coverage, lesson fields, furigana of every Japanese text,
 * vocabulary and form control (a sentence only uses words and conjugated
 * forms taught so far), exercise consistency.
 */
import { conjClassOf, expandPattern, FUNCTION_WORDS, hasJapanese, isKana, isKanji, toHiragana, tokenize, validateQuestion, type JaLexicon, type Token } from '@j-learn-write/grader';
import { parseRuby, rubyText, runReadingOk } from './furigana.ts';
import type {
  CurriculumLesson,
  Exercise,
  KanaEntry,
  LessonContent,
  LevelId,
  LevelStatus,
  ListGrammar,
  ListKanji,
  ListWord,
  NameEntry,
  Review,
} from './types.ts';

export interface FormGrammar {
  verb: Record<string, string[]>;
  derived: Record<string, string[]>;
  adjective: Record<string, string[]>;
  /** Function-word id (grader function-words.json) → grammar points, any of which allows it. */
  function: Record<string, string[]>;
}

export interface CourseData {
  curriculum: CurriculumLesson[];
  vocabulary: ListWord[];
  kanji: ListKanji[];
  grammar: ListGrammar[];
  kana: KanaEntry[];
  names: NameEntry[];
  levels: Record<string, LevelStatus>;
  lessons: LessonContent[];
  formGrammar: FormGrammar;
  /** Counters each extra grammar point allows (data/grammar-extra.json). */
  counterGrammar: Record<string, string>;
  /** Kana not taught in the kana stage. */
  kanaNotTaught: string;
}

export interface CheckTools {
  lexicon: JaLexicon;
  /** Acceptable readings of a kanji (KANJIDIC2 with sound changes). */
  kanjiReadings: (ch: string) => ReadonlySet<string> | undefined;
}

const LEVEL_ORDER: LevelId[] = ['kana', 'n5', 'n4'];
const REVIEW_STATUS = new Set(['draft', 'approved', 'changes_requested']);
const SENTENCE_END = /[。！？]$/;
const ITERATION = String.fromCharCode(0x3005);

const nonEmpty = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
const sameSet = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && new Set(a).size === new Set([...a, ...b]).size;
export const lessonId = (level: LevelId, order: number) => `${level}-${String(order).padStart(2, '0')}`;

/** A Japanese text of a lesson, where it appears, and how it is checked. */
export interface LessonText {
  text: string;
  where: string;
  /** "correct": vocabulary control applies; "wrong": a learner mistake shown as such (furigana only). */
  kind: 'correct' | 'wrong';
}

/** Model answers of a translate or question exercise (first expansion of each pattern). */
function modelAnswers(answers: readonly (string | { text: string })[]): string[] {
  return answers.map((a) => (typeof a === 'string' ? a : a.text)).map((p) => expandPattern(p)[0]!);
}

/** Every Japanese text of an exercise that the app shows (needs furigana, vocabulary control). */
export function exerciseTexts(ex: Exercise): string[] {
  const ja = (list: readonly (string | undefined)[]) => list.filter((s): s is string => typeof s === 'string' && hasJapanese(s));
  switch (ex.type) {
    case 'choice':
      return ja([ex.ja, ...ex.options]);
    case 'fill':
      return ja([ex.before + ex.answers[0] + ex.after, ...ex.answers, ...(ex.options ?? [])]);
    case 'order':
      return ja([...ex.tiles, ...ex.answers]);
    case 'translate':
      return ja(modelAnswers(ex.answers));
    case 'question': {
      const q = ex.question;
      const expected = 'expected' in q ? q.expected.sentence : undefined;
      return ja([q.prompt, expected, ...('answers' in q ? modelAnswers(q.answers) : [])]);
    }
    case 'match':
      return ja(ex.pairs.flat());
  }
}

/**
 * Texts of a kana-stage exercise that must use taught kana only: everything
 * except the wrong options of a choice (look-alike distractors such as め for
 * あ are useful even before め is taught).
 */
export function kanaAnswerTexts(ex: Exercise): string[] {
  if (ex.type === 'choice') return [ex.ja, ex.options[ex.answer]].filter((s): s is string => typeof s === 'string' && hasJapanese(s));
  return exerciseTexts(ex);
}

/** Every Japanese text of a lesson. */
export function lessonTexts(lesson: LessonContent): LessonText[] {
  const out: LessonText[] = [];
  const add = (text: string, where: string, kind: LessonText['kind'] = 'correct') => out.push({ text, where, kind });
  for (const p of lesson.practice ?? []) add(p.ja, `practice ${p.ja}`);
  for (const w of lesson.words ?? []) w.examples.forEach((s, i) => add(s.ja, `word ${w.no} example ${i + 1}`));
  for (const g of lesson.grammar ?? []) {
    g.examples.forEach((s, i) => add(s.ja, `grammar ${g.id} example ${i + 1}`));
    (g.mistakes ?? []).forEach((m, i) => {
      add(m.right, `grammar ${g.id} mistake ${i + 1}`);
      add(m.wrong, `grammar ${g.id} mistake ${i + 1} (wrong)`, 'wrong');
    });
  }
  for (const ex of lesson.exercises) for (const t of exerciseTexts(ex)) add(t, ex.id);
  return out;
}

/** Checks the whole course; returns problems as "where: message". */
export function validateCourse(data: CourseData, tools: CheckTools): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  const wordByNo = new Map(data.vocabulary.map((w) => [w.no, w]));
  const kanjiByChar = new Map(data.kanji.map((k) => [k.char, k]));
  const grammarById = new Map(data.grammar.map((g) => [g.id, g]));
  // data/form-grammar.json names existing grammar points and function words.
  const functionIds = new Set(FUNCTION_WORDS.map((f) => f.id));
  for (const [table, map] of Object.entries(data.formGrammar)) {
    if (typeof map !== 'object' || map === null) continue;
    for (const [key, ids] of Object.entries(map as Record<string, string[]>)) {
      for (const id of ids) if (!grammarById.has(id)) err('form-grammar', `${table} ${key}: unknown grammar point ${id}`);
      if (table === 'function' && !functionIds.has(key)) err('form-grammar', `function ${key}: not a grader function word`);
    }
  }
  const teachKana = data.kana.filter((k) => !data.kanaNotTaught.includes(k.kana));
  const kanaSet = new Set(teachKana.map((k) => k.kana));

  // ------------------------------------------------------------ curriculum
  const rank = (l: CurriculumLesson) => LEVEL_ORDER.indexOf(l.level) * 1000 + l.order;
  const ordered = [...data.curriculum].sort((a, b) => rank(a) - rank(b));
  const lessonById = new Map<string, CurriculumLesson>();
  const wordLesson = new Map<number, CurriculumLesson>();
  const kanjiLesson = new Map<string, CurriculumLesson>();
  const grammarLesson = new Map<string, CurriculumLesson>();
  const kanaLesson = new Map<string, CurriculumLesson>();
  for (const l of ordered) {
    if (lessonById.has(l.id)) err(l.id, 'duplicate lesson id in the curriculum');
    lessonById.set(l.id, l);
    if (!LEVEL_ORDER.includes(l.level)) err(l.id, `unknown level ${l.level}`);
    if (l.id !== lessonId(l.level, l.order)) err(l.id, 'id must be <level>-<order, 2 digits>');
    for (const key of ['titleVi', 'topicVi'] as const) if (!nonEmpty(l[key])) err(l.id, `${key} is required`);
    for (const no of l.words ?? []) {
      const w = wordByNo.get(no);
      if (!w) err(l.id, `word ${no} is not in the list`);
      else if (w.level !== l.level) err(l.id, `word ${no} ${w.word} is ${w.level}`);
      const before = wordLesson.get(no);
      if (before) err(l.id, `word ${no} is already taught in ${before.id}`);
      wordLesson.set(no, l);
    }
    for (const ch of l.kanji ?? []) {
      const k = kanjiByChar.get(ch);
      if (!k) err(l.id, `kanji ${ch} is not in the list`);
      else if (k.level !== l.level) err(l.id, `kanji ${ch} is ${k.level}`);
      const before = kanjiLesson.get(ch);
      if (before) err(l.id, `kanji ${ch} is already taught in ${before.id}`);
      kanjiLesson.set(ch, l);
    }
    for (const id of l.grammar ?? []) {
      const g = grammarById.get(id);
      if (!g) err(l.id, `grammar ${id} is not in the list`);
      else if (g.level !== l.level) err(l.id, `grammar ${id} is ${g.level}`);
      const before = grammarLesson.get(id);
      if (before) err(l.id, `grammar ${id} is already taught in ${before.id}`);
      grammarLesson.set(id, l);
    }
    for (const k of l.kana ?? []) {
      if (!kanaSet.has(k)) err(l.id, `kana ${k} is not in the kana table`);
      const before = kanaLesson.get(k);
      if (before) err(l.id, `kana ${k} is already taught in ${before.id}`);
      kanaLesson.set(k, l);
    }
    if (l.level !== 'kana' && (l.words ?? []).length === 0) err(l.id, 'a lesson needs words');
    if (l.level === 'kana' && (l.kana ?? []).length === 0 && !/kiểm tra|ôn/i.test(l.titleVi)) err(l.id, 'a kana lesson needs kana');
  }
  for (const level of LEVEL_ORDER) {
    const orders = ordered.filter((l) => l.level === level).map((l) => l.order);
    if (orders.some((o, i) => o !== i + 1)) err(level, `lesson orders must be 1..${orders.length}`);
    if (data.levels[level] !== 'complete') continue;
    if (level === 'kana') {
      const missing = teachKana.filter((k) => !kanaLesson.has(k.kana)).map((k) => k.kana);
      if (missing.length > 0) err('kana', `kana not taught: ${missing.join(' ')}`);
      continue;
    }
    const words = data.vocabulary.filter((w) => w.level === level && !wordLesson.has(w.no));
    if (words.length > 0) err(level, `${words.length} words not taught: ${words.slice(0, 20).map((w) => `${w.no} ${w.word}`).join(', ')}`);
    const kanji = data.kanji.filter((k) => k.level === level && !kanjiLesson.has(k.char));
    if (kanji.length > 0) err(level, `${kanji.length} kanji not taught: ${kanji.map((k) => k.char).join('')}`);
    const grammar = data.grammar.filter((g) => g.level === level && !grammarLesson.has(g.id));
    if (grammar.length > 0) err(level, `${grammar.length} grammar points not taught: ${grammar.map((g) => g.id).join(', ')}`);
  }

  // ------------------------------------------------------------ what is known before each lesson
  const knownWords = (l: CurriculumLesson) => new Set(ordered.filter((x) => rank(x) <= rank(l)).flatMap((x) => x.words ?? []));
  const knownGrammar = (l: CurriculumLesson) => new Set(ordered.filter((x) => rank(x) <= rank(l)).flatMap((x) => x.grammar ?? []));
  const knownKana = (l: CurriculumLesson) => new Set(ordered.filter((x) => rank(x) <= rank(l)).flatMap((x) => x.kana ?? []));
  const names = new Set(data.names.map((n) => n.ja));
  const dictionaryRuns = new Set<string>();
  // Every furigana segment of the course words (JmdictFurigana): 引 びき in 字引 is a reading of 引.
  for (const w of data.vocabulary) for (const m of [w.ruby, ...(w.formsRuby ?? [])]) for (const s of parseRuby(m)) if (s.rt) dictionaryRuns.add(`${s.text}|${toHiragana(s.rt)}`);
  for (const n of data.names) dictionaryRuns.add(`${n.ja}|${toHiragana(n.reading)}`);

  const formAllowed = (cls: string, tags: readonly string[], grammar: ReadonlySet<string>): string | null => {
    const adjective = cls === 'adj-i' || cls === 'adj-ix';
    const rest = [...tags];
    const need: string[][] = [];
    if (!adjective && rest[0] && data.formGrammar.derived[rest[0]]) need.push(data.formGrammar.derived[rest.shift()!]!);
    const table = adjective ? data.formGrammar.adjective : data.formGrammar.verb;
    const key = rest.join('+');
    const req = table[key];
    if (req === undefined) return `form ${tags.join('+') || 'dictionary'} has no grammar mapping`;
    need.push(req);
    const missing = need.find((anyOf) => anyOf.length > 0 && !anyOf.some((g) => grammar.has(g)));
    return missing ? `form ${tags.join('+') || 'dictionary'} needs grammar ${missing.join(' or ')}` : null;
  };

  /** Why a token is not allowed in this lesson (null when it is). */
  const tokenProblem = (t: Token, words: ReadonlySet<number>, grammar: ReadonlySet<string>): string | null => {
    const reasons: string[] = [];
    for (const a of t.analyses) {
      if (a.kind === 'punct' || a.kind === 'number' || a.kind === 'name') return null;
      if (a.kind === 'function') {
        const need = data.formGrammar.function[a.id];
        if (!need || need.some((g) => grammar.has(g))) return null;
        reasons.push(`needs grammar ${need.join(' or ')}`);
        continue;
      }
      if (a.kind === 'counted') {
        const point = data.counterGrammar[a.counter];
        if (!point || grammar.has(point)) return null;
        reasons.push(`counter ${a.counter} needs grammar ${point}`);
        continue;
      }
      if (a.kind === 'unknown') {
        // A counter on its own (円, 歳 as an answer option) once its grammar point is taught.
        const point = data.counterGrammar[t.surface];
        if (point && grammar.has(point)) return null;
        reasons.push(point ? `counter ${t.surface} needs grammar ${point}` : 'not a course word');
        continue;
      }
      if (!words.has(a.no)) {
        reasons.push(`word ${a.no} ${a.word} is taught later`);
        continue;
      }
      const cls = conjClassOf(a.word, a.pos);
      if (!cls) return null;
      const formProblem = formAllowed(cls, a.tags, grammar);
      if (!formProblem) return null;
      reasons.push(formProblem);
    }
    return reasons[0] ?? 'not allowed';
  };

  const checkRuby = (where: string, text: string, markup: string | undefined) => {
    if (markup === undefined) {
      if ([...text].some(isKanji)) err(where, `missing furigana for 「${text}」 (run npm run content:fill)`);
      return;
    }
    if (rubyText(markup) !== text) return err(where, `furigana text differs from 「${text}」`);
    const segs = parseRuby(markup);
    for (const [i, s] of segs.entries()) {
      const plainKanji = !s.rt && [...s.text].some(isKanji);
      if (plainKanji) err(where, `kanji without furigana 「${s.text}」 in 「${text}」 (run npm run content:fill)`);
      if (!s.rt) continue;
      const counted = isCountedRun(s.text, s.rt, tools);
      const afterDigits = isCounterAfterDigits(segs.slice(0, i).map((x) => x.text).join(''), s, tools);
      if (!counted && !afterDigits && ![...s.text].every((c) => isKanji(c) || c === ITERATION)) err(where, `furigana run 「${s.text}」 must be kanji only`);
      if (![...s.rt].every((c) => isKana(c))) err(where, `furigana 「${s.rt}」 must be kana`);
      const ok = dictionaryRuns.has(`${s.text}|${toHiragana(s.rt)}`) || runReadingOk(s.text, s.rt, tools.kanjiReadings) || counted || afterDigits;
      if (!ok) err(where, `「${s.text}」 cannot be read 「${s.rt}」 in 「${text}」`);
    }
  };

  // ------------------------------------------------------------ lessons
  const contentIds = new Set<string>();
  const exerciseIds = new Set<string>();
  for (const content of data.lessons) {
    const meta = lessonById.get(content.id);
    if (!meta) {
      err(String(content.id), 'lesson file has no curriculum entry');
      continue;
    }
    if (contentIds.has(content.id)) err(content.id, 'duplicate lesson file');
    contentIds.add(content.id);
    const where = content.id;
    if (!Array.isArray(content.goalsVi) || content.goalsVi.length === 0 || !content.goalsVi.every(nonEmpty)) err(where, 'goalsVi needs at least one goal');
    if (!sameSet((content.words ?? []).map((w) => w.no), meta.words ?? [])) err(where, 'words must be the curriculum words');
    if (!sameSet((content.kanji ?? []).map((k) => k.char), meta.kanji ?? [])) err(where, 'kanji must be the curriculum kanji');
    if (!sameSet((content.grammar ?? []).map((g) => g.id), meta.grammar ?? [])) err(where, 'grammar must be the curriculum grammar points');

    const review = (w: string, r: Review | undefined, required: boolean) => {
      if (!r) {
        if (required) err(w, 'missing review');
        return;
      }
      if (!REVIEW_STATUS.has(r.status)) err(w, `bad review status "${String(r.status)}"`);
      if (r.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) err(w, 'review.date must be YYYY-MM-DD');
    };

    for (const w of content.words ?? []) {
      const ww = `${where} word ${w.no}`;
      const listed = wordByNo.get(w.no);
      if (listed && listed.word !== w.word) err(ww, `word must be ${listed.word}, got ${w.word}`);
      if (!Array.isArray(w.meaningsVi) || w.meaningsVi.length === 0 || !w.meaningsVi.every(nonEmpty)) err(ww, 'meaningsVi needs at least one meaning');
      if (w.noteVi !== undefined && !nonEmpty(w.noteVi)) err(ww, 'noteVi must be text');
      if (!Array.isArray(w.examples) || w.examples.length === 0) err(ww, 'needs at least one example');
      w.examples?.forEach((s, i) => {
        if (!nonEmpty(s.vi)) err(`${ww} example ${i + 1}`, 'vi is required');
        const uses = tokenize(s.ja, tools.lexicon).some((t) => t.analyses.some((a) => a.kind === 'word' && a.no === w.no));
        if (!uses) err(`${ww} example ${i + 1}`, `example should use 「${w.word}」`);
      });
      review(ww, w.review, true);
    }
    for (const k of content.kanji ?? []) {
      const kw = `${where} kanji ${k.char}`;
      if (!nonEmpty(k.meaningVi)) err(kw, 'meaningVi is required');
      review(kw, k.review, true);
    }
    for (const g of content.grammar ?? []) {
      const gw = `${where} grammar ${g.id}`;
      for (const key of ['titleVi', 'summaryVi'] as const) if (!nonEmpty(g[key])) err(gw, `${key} is required`);
      if (!Array.isArray(g.explanationVi) || g.explanationVi.length === 0 || !g.explanationVi.every(nonEmpty)) err(gw, 'explanationVi needs paragraphs');
      if (!Array.isArray(g.examples) || g.examples.length === 0) err(gw, 'needs at least one example');
      g.examples?.forEach((s, i) => !nonEmpty(s.vi) && err(`${gw} example ${i + 1}`, 'vi is required'));
      (g.mistakes ?? []).forEach((m, i) => {
        if (!nonEmpty(m.wrong) || !nonEmpty(m.right) || !nonEmpty(m.noteVi)) err(`${gw} mistake ${i + 1}`, 'wrong, right and noteVi are required');
        if (m.wrong === m.right) err(`${gw} mistake ${i + 1}`, 'wrong and right are the same');
      });
      review(gw, g.review, true);
    }

    // Exercises.
    for (const ex of content.exercises ?? []) {
      const ew = `${where} ${ex.id}`;
      if (!nonEmpty(ex.id) || !new RegExp(`^${content.id}-e\\d{2}$`).test(ex.id)) err(ew, `id must be ${content.id}-eNN`);
      if (exerciseIds.has(ex.id)) err(ew, 'duplicate exercise id');
      exerciseIds.add(ex.id);
      for (const id of ex.grammar ?? []) {
        const taught = grammarLesson.get(id);
        if (!grammarById.has(id)) err(ew, `grammar ${id} is not in the list`);
        else if (!taught) err(ew, `grammar ${id} is not taught in any lesson`);
        else if (rank(taught) > rank(meta)) err(ew, `grammar ${id} is taught later (${taught.id})`);
      }
      review(ew, ex.review, false);
      checkExercise(ex, ew, err);
    }

    // Japanese texts: furigana, endings, vocabulary and forms.
    const words = knownWords(meta);
    const grammar = knownGrammar(meta);
    const kanaKnown = knownKana(meta);
    const ruby = content.ruby ?? {};
    const seen = new Set<string>();
    const kanaChecked = new Set([...(content.practice ?? []).map((p) => p.ja), ...content.exercises.flatMap(kanaAnswerTexts)]);
    for (const t of lessonTexts(content)) {
      seen.add(t.text);
      checkRuby(`${where} ${t.where}`, t.text, ruby[t.text]);
      if (t.where.includes('example') && !SENTENCE_END.test(t.text)) err(`${where} ${t.where}`, `「${t.text}」 must end with 。！？`);
      if (meta.level === 'kana') {
        const unknownKana = kanaChecked.has(t.text) ? [...t.text].filter((c) => isKana(c) && !kanaKnown.has(c)) : [];
        if ([...t.text].some(isKanji)) err(`${where} ${t.where}`, `kana lessons use no kanji: 「${t.text}」`);
        if (unknownKana.length > 0) err(`${where} ${t.where}`, `kana not taught yet: ${[...new Set(unknownKana)].join('')} in 「${t.text}」`);
        continue;
      }
      if (t.kind !== 'correct') continue;
      for (const tok of tokenize(t.text, tools.lexicon)) {
        const problem = tokenProblem(tok, words, grammar);
        if (problem) err(`${where} ${t.where}`, `「${tok.surface}」 ${problem} in 「${t.text}」`);
      }
    }
    for (const key of Object.keys(ruby)) if (!seen.has(key)) err(where, `unused furigana entry 「${key}」 (run npm run content:fill)`);
  }
  return errors;
}


/** The counter of a digits + counter token (3{本|ぼん}): its reading must end that token's reading. */
function isCounterAfterDigits(before: string, seg: { text: string; rt?: string }, tools: CheckTools): boolean {
  const digits = /\d{1,3}(?:,\d{3})+$|\d+$/.exec(before)?.[0];
  if (!digits || !seg.rt) return false;
  const tokens = tokenize(digits + seg.text, tools.lexicon);
  return tokens.length === 1 && tokens[0]!.analyses.some((a) => a.kind === 'counted' && toHiragana(a.reading).endsWith(toHiragana(seg.rt!)));
}

/** A run read as number + counter (三本 さんぼん, 一人 ひとり). */
function isCountedRun(text: string, rt: string, tools: CheckTools): boolean {
  return tokenize(text, tools.lexicon).length === 1 && tokenize(text, tools.lexicon)[0]!.analyses.some((a) => a.kind === 'counted' && toHiragana(a.reading) === toHiragana(rt));
}

/** Until the Japanese grader exists (docs/plan.md, phase 6), the app cannot grade free answers. */
const FREE_ANSWERS_NOT_READY = 'translate and question exercises need the Japanese grader (docs/plan.md, phase 6)';

function checkExercise(ex: Exercise, where: string, err: (where: string, msg: string) => void): void {
  switch (ex.type) {
    case 'choice':
      if (!nonEmpty(ex.promptVi)) err(where, 'promptVi is required');
      if (!Array.isArray(ex.options) || ex.options.length < 2 || !ex.options.every(nonEmpty)) err(where, 'needs at least 2 options');
      else if (new Set(ex.options).size !== ex.options.length) err(where, 'options must differ');
      if (!Number.isInteger(ex.answer) || ex.answer < 0 || ex.answer >= (ex.options?.length ?? 0)) err(where, 'answer must index an option');
      break;
    case 'fill':
      if (typeof ex.before !== 'string' || typeof ex.after !== 'string') err(where, 'before and after are required');
      if (!Array.isArray(ex.answers) || ex.answers.length === 0 || !ex.answers.every(nonEmpty)) err(where, 'needs answers');
      if (ex.options && !ex.answers.every((a) => ex.options!.includes(a))) err(where, 'every answer must be one of the options');
      if (ex.options && new Set(ex.options).size !== ex.options.length) err(where, 'options must differ');
      if (!SENTENCE_END.test(ex.after ?? '')) err(where, 'after must end the sentence (。！？)');
      break;
    case 'order':
      if (!nonEmpty(ex.vi)) err(where, 'vi is required');
      if (!Array.isArray(ex.tiles) || ex.tiles.length < 2 || !ex.tiles.every(nonEmpty)) err(where, 'needs at least 2 tiles');
      if (!Array.isArray(ex.answers) || ex.answers.length === 0) err(where, 'needs answers');
      for (const a of ex.answers ?? []) if (!canBuild(a, ex.tiles ?? [])) err(where, `answer 「${a}」 cannot be built from the tiles`);
      if (new Set(ex.answers).size !== (ex.answers ?? []).length) err(where, 'answers must differ');
      if (ex.answers?.some((a) => /[。！？、]/.test(a))) err(where, 'answers have no punctuation');
      break;
    case 'translate':
      err(where, FREE_ANSWERS_NOT_READY);
      if (!nonEmpty(ex.vi)) err(where, 'vi is required');
      for (const e of validateQuestion({ id: ex.id, lang: 'ja', type: 'model', prompt: ex.vi, answers: ex.answers, examples: ex.examples })) err(where, e);
      break;
    case 'question':
      err(where, FREE_ANSWERS_NOT_READY);
      for (const e of validateQuestion({ ...ex.question, id: ex.id, lang: 'ja' })) err(where, e);
      break;
    case 'match':
      if (!nonEmpty(ex.promptVi)) err(where, 'promptVi is required');
      if (!Array.isArray(ex.pairs) || ex.pairs.length < 2) err(where, 'needs at least 2 pairs');
      break;
    default:
      err(where, `unknown exercise type ${(ex as { type: string }).type}`);
  }
}

/** True when the tiles (each used once) can be concatenated into `answer`. */
export function canBuild(answer: string, tiles: readonly string[]): boolean {
  const used = new Array(tiles.length).fill(false);
  const go = (pos: number): boolean => {
    if (pos === answer.length) return used.every(Boolean);
    for (let i = 0; i < tiles.length; i++) {
      if (used[i] || !answer.startsWith(tiles[i]!, pos)) continue;
      used[i] = true;
      if (go(pos + tiles[i]!.length)) return true;
      used[i] = false;
    }
    return false;
  };
  return go(0);
}
