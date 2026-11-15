/**
 * Builds the course lists (data/jlpt/*.json, data/kana.json) from the source
 * subsets in sources/. Pure functions: scripts/build-data.ts writes the files,
 * and a test checks that the committed files equal a fresh build.
 */
import { JaLexicon, tokenize } from '@j-learn-write/grader';
import { chooseHanViet, isKnownReading, type HanVietSources } from './hanviet.ts';
import type { JlptLevel, KanaEntry, KanaKind, ListGrammar, ListKanji, ListWord } from './types.ts';

export interface OjWord {
  id: string;
  level: string;
  word: string;
  reading: string;
  pos: string[];
  jmdictId: number;
  meaningsEn: string[];
}
export interface OjKanji {
  char: string;
  level: string;
  supplementary: boolean;
}
export interface OjGrammar {
  id: string;
  level: string;
  pattern: string;
  meaning: string;
}
export interface JmEntry {
  seq: number;
  kanji: { text: string; pri: string[]; inf: string[] }[];
  readings: { text: string; pri: string[]; restr: string[]; inf: string[]; nokanji: boolean }[];
  senses: { pos: string[]; misc: string[]; gloss: string[]; stagk: string[]; stagr: string[] }[];
}
export interface KdChar {
  char: string;
  grade: number | null;
  jlptOld: number | null;
  strokes: number;
  on: string[];
  kun: string[];
  vi: string[];
  meaningsEn: string[];
}
export interface FuriEntry {
  text: string;
  reading: string;
  furigana: { ruby: string; rt?: string }[];
}
export interface IdsLock {
  words: Record<string, number>;
}

export interface ExtraWord {
  word: string;
  reading: string;
  jmdictId: number;
  level: string;
}

/** data/vocabulary-fixes.json: what the course uses instead of OpenJLPT's word (the upstream spelling stays accepted). */
export interface WordFix {
  /** Written form (display form when its kanji are usual). */
  word?: string;
  reading?: string;
  /** JMdict entry, when OpenJLPT links the wrong one. */
  jmdictId?: number;
  /** More accepted spellings (ゆっくり for ゆっくりと). */
  forms?: string[];
  /** Level the course teaches it at, when a grammar point of that level needs it (ぜんぜん for 全然〜ない, N5). */
  level?: string;
  why: string;
}

export interface ExtraGrammar {
  id: string;
  level: string;
  pattern: string;
  titleVi: string;
  counters?: string[];
}

export interface BuildSources {
  vocabulary: OjWord[];
  /** Grammar points the course adds (data/grammar-extra.json). */
  extraGrammar: ExtraGrammar[];
  /** Words the course adds (data/vocabulary-extra.json). */
  extraWords: ExtraWord[];
  /** Corrections to OpenJLPT words by OpenJLPT id (data/vocabulary-fixes.json). */
  wordFixes: Record<string, WordFix>;
  kanji: OjKanji[];
  grammar: OjGrammar[];
  jmdict: JmEntry[];
  kanjidic: KdChar[];
  furigana: FuriEntry[];
  hanviet: Omit<HanVietSources, 'kanjidic'>;
  /** Draft Hán Việt readings of whole words (display form → "miễn cưỡng"), chosen by the author for the meaning in the word. */
  wordHanViet: Record<string, string>;
  /** Number of strokes by character (KanjiVG). */
  strokeCounts: Record<string, number>;
  /** Romaji of a kana string (WanaKana toRomaji). */
  toRomaji: (kana: string) => string;
  lock: IdsLock;
}

export interface BuildResult {
  vocabulary: ListWord[];
  kanji: ListKanji[];
  grammar: ListGrammar[];
  kana: KanaEntry[];
  lock: IdsLock;
  /** Problems that need a person (missing furigana, no Hán Việt reading…). */
  problems: string[];
}

/** Kanji added to the N5 kanji to learn (docs/plan.md, 3.2). */
export const EXTRA_N5_KANJI = ['分'];
const HAN = /\p{Script=Han}/u;
export const kanjiOf = (text: string) => [...text].filter((c) => HAN.test(c));
const ITERATION = String.fromCharCode(0x3005);
/** Written forms JMdict marks as rare, outdated, search-only or irregular: not accepted as answers. */
const BAD_FORM = new Set(['rK', 'oK', 'sK', 'iK', 'ateji']);

const level = (l: string): JlptLevel => {
  if (l !== 'n5' && l !== 'n4') throw new Error(`unknown level ${l}`);
  return l;
};
const unique = <T>(items: readonly T[]) => [...new Set(items)];

/** Furigana markup of a written form: kana as is, kanji runs as {漢字|かんじ}. */
export function rubyMarkup(segments: readonly { ruby: string; rt?: string }[]): string {
  return segments.map((s) => (s.rt && HAN.test(s.ruby) ? `{${s.ruby}|${s.rt}}` : s.ruby)).join('');
}

export function buildJlptData(src: BuildSources): BuildResult {
  const problems: string[] = [];
  const kd = new Map(src.kanjidic.map((k) => [k.char, k]));
  const hv: HanVietSources = { ...src.hanviet, kanjidic: new Map(src.kanjidic.map((k) => [k.char, k.vi])) };
  const jm = new Map(src.jmdict.map((e) => [e.seq, e]));
  const furi = new Map(src.furigana.map((f) => [`${f.text}|${f.reading}`, f]));

  // Kanji to learn: the non-supplementary kanji of each level, plus EXTRA_N5_KANJI.
  const learn = src.kanji.filter((k) => !k.supplementary).map((k) => ({ char: k.char, level: level(k.level) }));
  for (const c of EXTRA_N5_KANJI) if (!learn.some((k) => k.char === c)) learn.push({ char: c, level: 'n5' });
  learn.sort((a, b) => (a.level === b.level ? 0 : a.level === 'n5' ? -1 : 1));
  const kanji: ListKanji[] = learn.map((k, i) => {
    const info = kd.get(k.char);
    if (!info) throw new Error(`KANJIDIC2 has no ${k.char}`);
    const hvChoice = chooseHanViet(k.char, hv);
    if (!hvChoice.main && hvChoice.basis !== 'override') problems.push(`kanji ${k.char}: no Hán Việt reading`);
    const item: ListKanji = {
      no: i + 1,
      char: k.char,
      level: k.level,
      on: info.on,
      kun: info.kun,
      strokes: info.strokes,
      hanViet: hvChoice.main,
      hanVietOthers: hvChoice.others,
    };
    if (hvChoice.ambiguous) item.hanVietAmbiguous = true;
    if (info.jlptOld !== null) item.jlptOld = info.jlptOld;
    return item;
  });

  // Words, numbered through the lock file so that numbers never change.
  const lock: IdsLock = { words: { ...src.lock.words } };
  let next = Math.max(0, ...Object.values(lock.words)) + 1;
  const vocabulary: ListWord[] = [];
  /** Other kanji spellings, checked below before they are accepted. */
  const candidates = new Map<number, string[]>();
  const extras: OjWord[] = src.extraWords.map((x) => ({
    id: `extra-${x.jmdictId}-${x.reading}`,
    level: x.level,
    word: x.word,
    reading: x.reading,
    pos: [],
    jmdictId: x.jmdictId,
    meaningsEn: [],
  }));
  const extraIds = new Set(extras.map((x) => x.id));
  const fixed: (OjWord & { upstream?: string[]; moreForms?: string[] })[] = src.vocabulary.map((w) => {
    const fix = src.wordFixes[w.id];
    if (!fix) return w;
    return {
      ...w,
      word: fix.word ?? w.word,
      reading: fix.reading ?? w.reading,
      jmdictId: fix.jmdictId ?? w.jmdictId,
      level: fix.level ?? w.level,
      upstream: [w.word, w.reading],
      moreForms: fix.forms ?? [],
    };
  });
  for (const id of Object.keys(src.wordFixes)) if (!src.vocabulary.some((w) => w.id === id)) problems.push(`vocabulary fix ${id}: no such OpenJLPT word`);
  for (const w of [...fixed, ...extras] as (OjWord & { upstream?: string[]; moreForms?: string[] })[]) {
    const entry = jm.get(w.jmdictId);
    if (!entry) throw new Error(`JMdict has no entry ${w.jmdictId} (${w.word})`);
    const no = (lock.words[w.id] ??= next++);
    const firstSense = entry.senses[0];
    const usuallyKana = firstSense?.misc.includes('uk') ?? false;
    // KANJIDIC2 grades 1-6 and 8 are the Jōyō kanji; 9-10 are name kanji (賑).
    const outsideJoyo = kanjiOf(w.word).some((c) => c !== ITERATION && !((kd.get(c)?.grade ?? 99) <= 8));
    const display = kanjiOf(w.word).length > 0 && (usuallyKana || outsideJoyo) ? w.reading : w.word;

    let ruby = display;
    if (kanjiOf(display).length > 0) {
      const f = furi.get(`${display}|${w.reading}`);
      if (f) ruby = rubyMarkup(f.furigana);
      else problems.push(`word ${no} ${display}: no furigana for reading ${w.reading}`);
    }

    // Other kanji spellings are accepted only for words shown in kana (わかる: 分かる): for a word
    // shown in kanji they may be another word of the same entry (開く / 空く), and okurigana
    // variants collide with other words (後 for 後ろ, 上る for 上がる). A spelling replaced by a
    // fix (終る → 終わる) stays accepted.
    const otherForms = (kanjiOf(display).length > 0 ? [] : entry.kanji)
      .filter((k) => k.pri.length > 0 && !k.inf.some((x) => BAD_FORM.has(x)) && !/\p{Nd}/u.test(k.text))
      .filter((k) => entry.readings.some((r) => r.text === w.reading && !r.nokanji && (r.restr.length === 0 || r.restr.includes(k.text))))
      .map((k) => k.text);
    const forms = unique([display, w.word, ...(w.upstream ?? []), w.reading, ...(w.moreForms ?? [])]);
    candidates.set(no, otherForms.filter((f) => !forms.includes(f)));

    const item: ListWord = {
      no,
      level: level(w.level),
      openjlptId: w.id,
      jmdictId: w.jmdictId,
      word: display,
      reading: w.reading,
      ruby,
      forms,
      pos: unique(entry.senses.flatMap((s) => s.pos)),
    };
    if (extraIds.has(w.id)) item.extra = true;
    const chars = kanjiOf(display).filter((c) => c !== ITERATION);
    if (chars.length > 0) {
      const choices = chars.map((c) => chooseHanViet(c, hv));
      const missing = chars.filter((_, i) => !choices[i]!.main && choices[i]!.basis !== 'override');
      if (missing.length > 0) problems.push(`word ${no} ${display}: no Hán Việt reading for ${missing.join('')}`);
      // A kanji made in Japan (kokuji) has no reading: shown as "-".
      const chosen = src.wordHanViet[display];
      if (chosen !== undefined) {
        const syllables = chosen.split(' ');
        const known = syllables.length === chars.length && syllables.every((s, i) => s === '-' || isKnownReading(chars[i]!, s, hv));
        if (!known) problems.push(`word ${no} ${display}: Hán Việt override "${chosen}" does not match its kanji`);
        item.hanViet = chosen;
      } else if (choices.some((c) => c.main)) {
        item.hanViet = choices.map((c) => c.main || '-').join(' ');
        if (choices.some((c) => c.ambiguous)) item.hanVietAmbiguous = true;
      }
    }
    vocabulary.push(item);
  }
  vocabulary.sort((a, b) => a.no - b.no);

  // An extra spelling that splits into course words is a phrase, not a spelling (今日は = 今日 + は, not こんにちは).
  const base = new JaLexicon(vocabulary.map((w) => ({ no: w.no, word: w.word, reading: w.reading, forms: w.forms.filter((f) => f !== w.word), pos: w.pos })));
  for (const w of vocabulary) {
    for (const form of candidates.get(w.no) ?? []) {
      const tokens = tokenize(form, base);
      const phrase = tokens.length > 1 && tokens.every((t) => t.analyses.every((a) => a.kind !== 'unknown'));
      if (!phrase) w.forms.push(form);
    }
    // Furigana of the other kanji spellings (美味しい: {美味|おい}しい), for checking sentences that use them.
    const formsRuby = w.forms
      .filter((f) => f !== w.word && kanjiOf(f).length > 0)
      .flatMap((f) => {
        const fr = furi.get(`${f}|${w.reading}`);
        return fr ? [rubyMarkup(fr.furigana)] : [];
      });
    if (formsRuby.length > 0) w.formsRuby = formsRuby;
  }

  const merged: { id: string; level: JlptLevel; pattern: string; extra?: boolean }[] = [
    ...src.grammar.map((g) => ({ id: g.id, level: level(g.level), pattern: g.pattern })),
    ...src.extraGrammar.map((g) => ({ id: g.id, level: level(g.level), pattern: g.pattern, extra: true })),
  ];
  const grammar: ListGrammar[] = merged.map((g, i) => ({ id: g.id, no: i + 1, level: g.level, pattern: g.pattern, ...(g.extra ? { extra: true } : {}) }));
  const ids = new Set<string>();
  for (const g of grammar) {
    if (ids.has(g.id)) problems.push(`grammar id ${g.id} is used twice`);
    ids.add(g.id);
  }

  return { vocabulary, kanji, grammar, kana: buildKana(src.toRomaji, src.strokeCounts), lock, problems };
}

// ---------------------------------------------------------------- kana

/** Small kana (Unicode Hiragana block); the katakana forms follow from the block offset. */
const SMALL_HIRAGANA = 'ぁぃぅぇぉっゃゅょゎゕゖ';
/** Not taught: archaic or very rare letters (to be confirmed by a teacher; docs/review-notes.md). */
export const KANA_NOT_TAUGHT = 'ゐゑゎぁぃぅぇぉゔゕゖヰヱヮヵヶヷヸヹヺ';
/** i-column kana that form the combined sounds (きゃ, しゅ…). */
const YOUON_BASES = 'きぎしじちにひびぴみり';
const YOUON_SMALL = 'ゃゅょ';
/**
 * Katakana combinations for loanwords, with Hepburn romaji. Written out because
 * WanaKana romanises some of them differently (ティ → "tei").
 */
export const EXTENDED_KATAKANA: readonly [string, string][] = [
  ['シェ', 'she'],
  ['ジェ', 'je'],
  ['チェ', 'che'],
  ['ティ', 'ti'],
  ['ディ', 'di'],
  ['トゥ', 'tu'],
  ['ドゥ', 'du'],
  ['ファ', 'fa'],
  ['フィ', 'fi'],
  ['フェ', 'fe'],
  ['フォ', 'fo'],
  ['ウィ', 'wi'],
  ['ウェ', 'we'],
  ['ウォ', 'wo'],
  ['ヴァ', 'va'],
  ['ヴィ', 'vi'],
  ['ヴ', 'vu'],
  ['ヴェ', 've'],
  ['ヴォ', 'vo'],
];
const KATAKANA_OFFSET = 0x60;
const toKatakana = (s: string) => [...s].map((c) => String.fromCodePoint(c.codePointAt(0)! + KATAKANA_OFFSET)).join('');
const DAKUTEN = String.fromCharCode(0x3099);
const HANDAKUTEN = String.fromCharCode(0x309a);
/** ー, the prolonged sound mark. */
const CHOON = String.fromCharCode(0x30fc);

function kindOf(ch: string): KanaKind {
  const hira = ch.codePointAt(0)! >= 0x30a1 ? String.fromCodePoint(ch.codePointAt(0)! - KATAKANA_OFFSET) : ch;
  if (SMALL_HIRAGANA.includes(hira)) return hira === 'っ' ? 'mark' : 'small';
  const nfd = ch.normalize('NFD');
  if (nfd.includes(DAKUTEN)) return 'voiced';
  if (nfd.includes(HANDAKUTEN)) return 'semi-voiced';
  return 'basic';
}

/** The kana taught in the kana stage: generated from the Unicode blocks, not typed by hand. */
export function buildKana(toRomaji: (kana: string) => string, strokes: Record<string, number>): KanaEntry[] {
  const out: KanaEntry[] = [];
  const single = (ch: string, script: KanaEntry['script']) => {
    const kind = kindOf(ch);
    const entry: KanaEntry = { kana: ch, script, kind, romaji: kind === 'mark' ? '' : toRomaji(ch) };
    if (strokes[ch] !== undefined) entry.strokes = strokes[ch];
    out.push(entry);
  };
  for (const script of ['hiragana', 'katakana'] as const) {
    for (let cp = 0x3041; cp <= 0x3093; cp++) {
      const hira = String.fromCodePoint(cp);
      const ch = script === 'hiragana' ? hira : toKatakana(hira);
      if (KANA_NOT_TAUGHT.includes(ch)) continue;
      single(ch, script);
    }
    for (const base of YOUON_BASES) {
      for (const small of YOUON_SMALL) {
        const pair = script === 'hiragana' ? base + small : toKatakana(base + small);
        out.push({ kana: pair, script, kind: 'combo', romaji: toRomaji(pair) });
      }
    }
  }
  for (const [kana, romaji] of EXTENDED_KATAKANA) {
    const entry: KanaEntry = { kana, script: 'katakana', kind: 'extended', romaji };
    if (kana.length === 1 && strokes[kana] !== undefined) entry.strokes = strokes[kana];
    out.push(entry);
  }
  const choon: KanaEntry = { kana: CHOON, script: 'katakana', kind: 'mark', romaji: '' };
  if (strokes[CHOON] !== undefined) choon.strokes = strokes[CHOON];
  out.push(choon);
  return out;
}

/** The grader's copy of the course words (packages/grader/src/lang/ja/data/words.json). */
export function graderWords(vocabulary: readonly ListWord[]): { no: number; word: string; reading: string; forms: string[]; pos: string[] }[] {
  return vocabulary.map((w) => ({ no: w.no, word: w.word, reading: w.reading, forms: w.forms.filter((f) => f !== w.word), pos: w.pos }));
}

/** One array item per line: readable diffs. */
export function jsonLines(items: readonly unknown[]): string {
  return `[\n${items.map((x) => JSON.stringify(x)).join(',\n')}\n]\n`;
}
