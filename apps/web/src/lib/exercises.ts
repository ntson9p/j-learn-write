/**
 * Checking every exercise type (deterministic) and generating drills: kana
 * drills from a kana lesson's characters, reading drills from its practice
 * words. Free answers (translate, question) go through the Japanese grader.
 */
import { exerciseQuestion, hashString, rubyReading, translateQuestion, type Exercise, type KanaEntry, type KanaPractice, type ListWord, type WordContent } from '@j-learn-write/course';
import { checkJaSentence, grade, normalizeJa, type GradeResult, type Issue } from '@j-learn-write/grader';
import { romanize, type RomajiTable } from './romaji';

/** A free answer counts as right from this score. */
export const PASS_SCORE = 80;

export type Answer =
  | { type: 'choice'; index: number }
  | { type: 'fill'; text: string }
  | { type: 'order'; tiles: string[] }
  | { type: 'text'; text: string }
  | { type: 'match'; mistakes: number };

export interface Outcome {
  correct: boolean;
  /** 0-100. */
  score: number;
  /** Grader result for free answers. */
  result?: GradeResult;
  /** Rule findings that explain a wrong word order. */
  issues?: Issue[];
  /** The expected answer to show after a mistake. */
  expected?: string;
}

/** What a checker may need from the lesson: the furigana of its texts (to accept answers typed in kana). */
export interface CheckContext {
  ruby?: Readonly<Record<string, string>>;
}

/** Text without punctuation, spaces or letter case, after the grader's normalization. */
export function plainText(text: string): string {
  return normalizeJa(text)
    .text.replace(/[\p{P}\p{S}\s]/gu, '')
    .toLowerCase();
}

/** Accepted spellings of an answer: as written, and its kana reading when the lesson gives its furigana. */
export function acceptedForms(answer: string, ctx: CheckContext = {}): string[] {
  const markup = ctx.ruby?.[answer];
  return markup ? [answer, rubyReading(markup)] : [answer];
}

/**
 * True when the learner typed Latin letters where the answer is Japanese:
 * the device's Japanese keyboard is off. Such an answer is not graded.
 */
export function needsJapaneseKeyboard(text: string, accepted: readonly string[]): boolean {
  return /[a-z]/i.test(normalizeJa(text).text) && !accepted.some((a) => /[a-z]/i.test(normalizeJa(a).text));
}

/** Seeded pseudo-random numbers (mulberry32): the same seed gives the same drill. */
export function rng(seed: string): () => number {
  let a = parseInt(hashString(seed), 16) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const r = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Tiles in an order that is not already an accepted answer (when possible). */
export function shuffledTiles(ex: Extract<Exercise, { type: 'order' }>): string[] {
  for (let k = 0; k < 8; k++) {
    const t = shuffle(ex.tiles, `${ex.id}#${k}`);
    if (!ex.answers.includes(t.join(''))) return t;
  }
  return shuffle(ex.tiles, ex.id);
}

export function check(ex: Exercise, answer: Answer, ctx: CheckContext = {}): Outcome {
  switch (ex.type) {
    case 'choice': {
      const ok = answer.type === 'choice' && answer.index === ex.answer;
      return { correct: ok, score: ok ? 100 : 0, expected: ex.options[ex.answer] };
    }
    case 'fill': {
      const given = answer.type === 'fill' ? plainText(answer.text) : '';
      const ok = given !== '' && ex.answers.some((a) => acceptedForms(a, ctx).some((f) => plainText(f) === given));
      return { correct: ok, score: ok ? 100 : 0, expected: ex.before + ex.answers[0] + ex.after };
    }
    case 'order': {
      const built = answer.type === 'order' ? answer.tiles.join('') : '';
      const ok = ex.answers.some((a) => plainText(a) === plainText(built));
      const out: Outcome = { correct: ok, score: ok ? 100 : 0, expected: ex.answers[0] };
      // A wrong order the rules can explain (上の机, 書きて…).
      if (!ok && built) {
        const issues = checkJaSentence(built).issues;
        if (issues.length > 0) out.issues = issues;
      }
      return out;
    }
    case 'translate':
    case 'question': {
      const text = answer.type === 'text' ? answer.text : '';
      const q = ex.type === 'translate' ? translateQuestion(ex) : exerciseQuestion(ex);
      const result = grade(q, text);
      return { correct: result.score >= PASS_SCORE, score: result.score, result };
    }
    case 'match': {
      const mistakes = answer.type === 'match' ? answer.mistakes : ex.pairs.length;
      const score = Math.round((100 * ex.pairs.length) / (ex.pairs.length + mistakes));
      return { correct: mistakes === 0, score };
    }
  }
}

/** A generated drill (not stored in the course data); `listen` is spoken instead of shown. */
export type Drill = Extract<Exercise, { type: 'choice' }> & { listen?: string };

function makeDrill(id: string, promptVi: string, right: string, wrong: readonly string[], extra: { ja?: string; listen?: string } = {}): Drill {
  const options = shuffle([right, ...wrong], `${id}#options`);
  return { id, type: 'choice', promptVi, options, answer: options.indexOf(right), ...extra };
}

/** Kana that a drill can ask about: read on their own (not っ, ー or a small ゃ alone). */
const drillable = (k: KanaEntry) => k.romaji !== '' && k.kind !== 'small' && k.kind !== 'mark';

/**
 * Drills on a kana lesson's characters, with a fixed seed: reading of a kana,
 * kana for a reading, and (with a voice) kana for a sound. Wrong options come
 * from `pool` (kana of the same script taught so far) and never share the
 * reading of the right one (じ/ぢ).
 */
export function kanaDrills(lessonId: string, taught: readonly KanaEntry[], pool: readonly KanaEntry[], opts: { count: number; listening: boolean }): Drill[] {
  const items = shuffle(taught.filter(drillable), `${lessonId}#kana`).slice(0, opts.count);
  const kinds = opts.listening ? 3 : 2;
  const out: Drill[] = [];
  items.forEach((k, i) => {
    const others = pool.filter((x) => drillable(x) && x.script === k.script && x.romaji !== k.romaji);
    const byRomaji = new Map(others.map((x) => [x.romaji, x]));
    const wrong = shuffle([...byRomaji.values()], `${lessonId}#${k.kana}#others`).slice(0, 3);
    if (wrong.length < 3) return;
    const id = `${lessonId}-k${String(i + 1).padStart(2, '0')}`;
    const kind = i % kinds;
    if (kind === 0) out.push(makeDrill(id, `Chữ「${k.kana}」đọc là gì?`, k.romaji, wrong.map((x) => x.romaji)));
    else if (kind === 1) out.push(makeDrill(id, `Chữ nào đọc là "${k.romaji}"?`, k.kana, wrong.map((x) => x.kana)));
    else out.push(makeDrill(id, 'Nghe và chọn chữ đúng.', k.kana, wrong.map((x) => x.kana), { listen: k.kana }));
  });
  return out;
}

/**
 * Drills on the practice words of a kana lesson: meaning of a word, its
 * romaji, and (with a voice) the word for a sound.
 */
export function practiceDrills(lessonId: string, practice: readonly KanaPractice[], table: RomajiTable, opts: { count: number; listening: boolean }): Drill[] {
  if (practice.length < 4) return [];
  const items = shuffle(practice, `${lessonId}#practice`).slice(0, opts.count);
  const kinds = opts.listening ? 3 : 2;
  const out: Drill[] = [];
  items.forEach((p, i) => {
    const romaji = romanize(p.ja, table);
    const others = shuffle(
      practice.filter((x) => x.ja !== p.ja && x.vi !== p.vi && romanize(x.ja, table) !== romaji),
      `${lessonId}#${p.ja}#others`,
    ).slice(0, 3);
    if (others.length < 3) return;
    const id = `${lessonId}-p${String(i + 1).padStart(2, '0')}`;
    const kind = i % kinds;
    if (kind === 0) out.push(makeDrill(id, `「${p.ja}」nghĩa là gì?`, p.vi, others.map((x) => x.vi)));
    else if (kind === 1) out.push(makeDrill(id, `「${p.ja}」đọc là gì?`, romaji, others.map((x) => romanize(x.ja, table))));
    else out.push(makeDrill(id, 'Nghe và chọn từ đúng.', p.ja, others.map((x) => x.ja), { listen: p.ja }));
  });
  return out;
}

/**
 * Drills on the words of a lesson (or level), with a fixed seed: meaning of
 * a word, word for a meaning, kana reading of a word written in kanji, and
 * (with a voice) the word for a sound. Wrong options never share the right
 * option's meaning, spelling or reading.
 */
export function wordDrills(seed: string, words: readonly WordContent[], listed: ReadonlyMap<number, ListWord>, opts: { count: number; listening: boolean }): Drill[] {
  const usable = words.filter((w) => listed.has(w.no) && w.meaningsVi[0]);
  if (usable.length < 4) return [];
  const picked = shuffle(usable, `${seed}#words`).slice(0, opts.count);
  const out: Drill[] = [];
  picked.forEach((w, i) => {
    const lw = listed.get(w.no)!;
    const hasKanji = lw.word !== lw.reading;
    const kinds = ['meaning', 'word', ...(hasKanji ? ['reading'] : []), ...(opts.listening ? ['listen'] : [])];
    const kind = kinds[i % kinds.length]!;
    const others = shuffle(
      usable.filter((x) => {
        const lx = listed.get(x.no)!;
        return x.no !== w.no && lx.word !== lw.word && lx.reading !== lw.reading && x.meaningsVi[0] !== w.meaningsVi[0];
      }),
      `${seed}#${w.no}#others`,
    ).slice(0, 3);
    if (others.length < 3) return;
    const id = `${seed}-w${String(i + 1).padStart(2, '0')}`;
    if (kind === 'meaning') out.push(makeDrill(id, `「${lw.word}」nghĩa là gì?`, w.meaningsVi[0]!, others.map((x) => x.meaningsVi[0]!)));
    else if (kind === 'word') out.push(makeDrill(id, `Từ nào nghĩa là "${w.meaningsVi[0]}"?`, lw.word, others.map((x) => listed.get(x.no)!.word)));
    else if (kind === 'reading') out.push(makeDrill(id, `「${lw.word}」đọc là gì?`, lw.reading, others.map((x) => listed.get(x.no)!.reading)));
    else out.push(makeDrill(id, 'Nghe và chọn từ đúng.', lw.word, others.map((x) => listed.get(x.no)!.word), { listen: lw.reading }));
  });
  return out;
}
