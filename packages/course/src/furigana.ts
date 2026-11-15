/**
 * Furigana markup: "{学生|がくせい}です" (kanji runs in braces with their
 * reading, everything else as written). Built by `npm run content:fill` from
 * the course words (never from a morphological analyser's guesses) and
 * checked against KANJIDIC2 readings.
 */
import { findCounter, isKana, isKanji, numberReading, toHiragana, tokenize, type JaLexicon, type Token } from '@j-learn-write/grader';

export interface RubySegment {
  text: string;
  /** Reading of `text` when it contains kanji. */
  rt?: string;
}

const RUBY = /\{([^|{}]+)\|([^{}]+)\}/g;

/** Segments of a markup string. */
export function parseRuby(markup: string): RubySegment[] {
  const out: RubySegment[] = [];
  let last = 0;
  for (const m of markup.matchAll(RUBY)) {
    if (m.index! > last) out.push({ text: markup.slice(last, m.index) });
    out.push({ text: m[1]!, rt: m[2]! });
    last = m.index! + m[0].length;
  }
  if (last < markup.length) out.push({ text: markup.slice(last) });
  return out;
}

/** Plain text of a markup string. */
export const rubyText = (markup: string) => parseRuby(markup).map((s) => s.text).join('');
/** Reading of a markup string (kana as written, kanji replaced by their reading). */
export const rubyReading = (markup: string) => parseRuby(markup).map((s) => s.rt ?? s.text).join('');

export function toMarkup(segments: readonly RubySegment[]): string {
  return segments.map((s) => (s.rt ? `{${s.text}|${s.rt}}` : s.text)).join('');
}

/**
 * Aligns a written form with its reading on the kana it contains:
 * 食べました / たべました → [{食|た}, べました]. Kanji runs get the reading
 * between the kana anchors. Null when the reading does not fit.
 */
export function alignReading(surface: string, reading: string): RubySegment[] | null {
  const runs: { text: string; kanji: boolean }[] = [];
  for (const ch of surface) {
    const kanji = isKanji(ch);
    const prev = runs.at(-1);
    if (prev && prev.kanji === kanji) prev.text += ch;
    else runs.push({ text: ch, kanji });
  }
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = runs.map((r) => (r.kanji ? '(.+?)' : `(${escape(toHiragana(r.text))})`)).join('');
  const m = new RegExp(`^${pattern}$`, 'u').exec(toHiragana(reading));
  if (!m) return null;
  return runs.map((r, i) => (r.kanji ? { text: r.text, rt: m[i + 1]! } : { text: r.text }));
}

/**
 * Splits a kanji run into one segment per kanji when a dictionary markup of
 * the word (its `ruby`) has the same run with the same reading.
 */
export function splitWithDictionary(seg: RubySegment, dictionary: readonly RubySegment[]): RubySegment[] {
  if (!seg.rt || [...seg.text].length < 2) return [seg];
  const kanjiSegs = dictionary.filter((d) => d.rt);
  for (let i = 0; i < kanjiSegs.length; i++) {
    let text = '';
    let rt = '';
    for (let j = i; j < kanjiSegs.length; j++) {
      text += kanjiSegs[j]!.text;
      rt += kanjiSegs[j]!.rt;
      if (text === seg.text && rt === toHiragana(seg.rt)) return kanjiSegs.slice(i, j + 1).map((d) => ({ text: d.text, rt: d.rt }));
      if (!seg.text.startsWith(text)) break;
    }
  }
  return [seg];
}

/**
 * Furigana of a number written in digits + counter (3本 さんぼん): the reading
 * of the counter after the number's own reading (3{本|ぼん}), or of the whole
 * run when the reading is irregular ({1人|ひとり}).
 */
export function countedRuby(surface: string, reading: string, _value: number): RubySegment[] {
  const digits = /^\d{1,3}(?:,\d{3})+|^\d+/.exec(surface)?.[0];
  if (!digits) return [{ text: surface, rt: reading }];
  const counter = surface.slice(digits.length);
  // The reading of the digits as written (3 in 3万円 is さん), with its sound changes (8千: はっ).
  const said = numberReading(Number(digits.replace(/,/g, '')));
  const prefixes = [said, said.replace(/(ち|く|つ|う)$/, 'っ'), said.replace(/じゅう$/, 'じゅっ'), said.replace(/じゅう$/, 'じっ')];
  for (const p of prefixes) {
    if (reading.startsWith(p) && reading.length > p.length) {
      const rest = reading.slice(p.length);
      // Kana inside the counter stay outside the furigana: 1か{月|げつ}.
      return [{ text: digits }, ...(alignReading(counter, rest) ?? [{ text: counter, rt: rest }])];
    }
  }
  return [{ text: surface, rt: reading }];
}

export interface FillProblem {
  /** Surface that needs attention. */
  surface: string;
  message: string;
}

/** Readings (hiragana) a token can have, from all its analyses. */
export function tokenReadings(t: Token): string[] {
  const out = new Set<string>();
  for (const a of t.analyses) if ('reading' in a) out.add(toHiragana(a.reading));
  return [...out];
}

/**
 * Readings chosen by context when a token has several (only clear cases;
 * anything else stays ambiguous for the author):
 * - 私: わたし (わたくし is the formal reading, written by hand when meant);
 * - 何: なん before で, です, だ, の, と; なに before を, が, も, か and in 何語.
 */
export function contextReading(surface: string, readings: readonly string[], next: string): string | undefined {
  const pick = (r: string) => (readings.includes(r) ? r : undefined);
  if (surface === '私') return pick('わたし');
  if (surface === '何') {
    if (/^(です|で|だ|の|と)/.test(next)) return pick('なん');
    if (/^[をがもか]/.test(next) || next.startsWith('語')) return pick('なに');
  }
  return undefined;
}

/**
 * Builds the furigana markup of a Japanese text. Tokens whose reading is
 * ambiguous take the reading of `previous` (an author's markup of the same
 * text) when it is one of the candidates; otherwise they are reported and
 * left without furigana. `rubyOfWord` gives the dictionary markup of a word
 * number (to split kanji runs per kanji).
 */
export function buildRuby(
  text: string,
  lexicon: JaLexicon,
  rubyOfWord: (no: number) => string | undefined,
  previous?: string,
): { markup: string; problems: FillProblem[] } {
  const problems: FillProblem[] = [];
  const prevSegs = previous && rubyText(previous) === text ? parseRuby(previous) : undefined;
  // Reading the previous markup gives to the characters [start, end).
  const previousReading = (start: number, end: number): string | undefined => {
    if (!prevSegs) return undefined;
    let pos = 0;
    let out = '';
    for (const s of prevSegs) {
      const segEnd = pos + s.text.length;
      if (segEnd > start && pos < end) {
        if (s.rt) {
          if (pos < start || segEnd > end) return undefined; // a furigana run crosses the token boundary
          out += s.rt;
        } else out += s.text.slice(Math.max(0, start - pos), Math.min(s.text.length, end - pos));
      }
      pos = segEnd;
    }
    return toHiragana(out);
  };

  const segments: RubySegment[] = [];
  for (const t of tokenize(text, lexicon)) {
    if (![...t.surface].some(isKanji)) {
      segments.push({ text: t.surface });
      continue;
    }
    let readings = tokenReadings(t);
    // A counter on its own (円, 歳 as a word option) reads as its counter reading.
    const counter = readings.length === 0 ? findCounter(t.surface) : undefined;
    if (counter?.reading && counter.counter === t.surface) readings = [counter.reading];
    if (readings.length === 0) {
      problems.push({ surface: t.surface, message: 'kanji not in the course words (unknown token): write its furigana by hand' });
      segments.push({ text: t.surface });
      continue;
    }
    if (readings.length > 1) {
      const chosen = previousReading(t.start, t.end);
      const byContext = contextReading(t.surface, readings, text.slice(t.end));
      if (chosen && readings.includes(chosen)) readings = [chosen];
      else if (byContext) readings = [byContext];
      else {
        problems.push({ surface: t.surface, message: `ambiguous reading (${[...readings].sort().join(' / ')}): choose one in the markup` });
        segments.push({ text: t.surface });
        continue;
      }
    }
    const counted = t.analyses.find((a) => a.kind === 'counted' && toHiragana(a.reading) === readings[0]);
    if (counted && counted.kind === 'counted' && /^\d/.test(t.surface) && counted.value !== null) {
      segments.push(...countedRuby(t.surface, readings[0]!, counted.value));
      continue;
    }
    const aligned = alignReading(t.surface, readings[0]!);
    if (!aligned) {
      problems.push({ surface: t.surface, message: `reading ${readings[0]} does not fit the written form` });
      segments.push({ text: t.surface });
      continue;
    }
    const word = t.analyses.find((a) => a.kind === 'word' && toHiragana(a.reading) === readings[0]);
    const dict = word && word.kind === 'word' ? rubyOfWord(word.no) : undefined;
    for (const seg of aligned) segments.push(...(dict ? splitWithDictionary(seg, parseRuby(dict)) : [seg]));
  }
  // Merge neighbouring plain segments.
  const merged: RubySegment[] = [];
  for (const s of segments) {
    const prev = merged.at(-1);
    if (prev && !prev.rt && !s.rt) prev.text += s.text;
    else merged.push({ ...s });
  }
  return { markup: toMarkup(merged), problems };
}

// ---------------------------------------------------------------- checking readings

export interface KanjiReadings {
  on: readonly string[];
  kun: readonly string[];
}

const VOICED: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
};
const SEMI: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' };

/** Reading variants of one kanji reading: as is, voiced (rendaku), p-sound, final small っ. */
function variants(r: string): string[] {
  const out = new Set([r]);
  const first = r[0]!;
  for (const map of [VOICED, SEMI]) if (map[first]) out.add(map[first] + r.slice(1));
  for (const v of [...out]) if (/[つちくき]$/.test(v)) out.add(`${v.slice(0, -1)}っ`);
  // じ for ち / ず for つ after rendaku (ぢ/づ are usually written じ/ず).
  for (const v of [...out]) out.add(v.replace(/^ぢ/, 'じ').replace(/^づ/, 'ず'));
  return [...out];
}

/** All acceptable readings of a kanji (hiragana), from KANJIDIC2. */
export function readingsOfKanji(k: KanjiReadings): Set<string> {
  const out = new Set<string>();
  for (const on of k.on) for (const v of variants(toHiragana(on))) out.add(v);
  for (const kun of k.kun) {
    const clean = kun.replace(/-/g, '');
    const [stem] = clean.split('.');
    for (const v of [...variants(stem!), ...variants(clean.replace('.', ''))]) out.add(v);
  }
  return out;
}

/**
 * True when `rt` reads the kanji run `text`: one kanji with a KANJIDIC2
 * reading (with sound changes), or several kanji that each take such a
 * reading. Runs with a special reading (今日 きょう) are checked by the caller.
 */
export function runReadingOk(text: string, rt: string, readingsOf: (ch: string) => ReadonlySet<string> | undefined): boolean {
  const chars = [...text];
  const reading = toHiragana(rt);
  const ok = (i: number, pos: number): boolean => {
    if (i === chars.length) return pos === reading.length;
    const ch = chars[i]!;
    // 々 repeats the previous kanji (with its sound changes).
    const set = ch === String.fromCharCode(0x3005) ? readingsOf(chars[i - 1] ?? '') : readingsOf(ch);
    if (!set) return false;
    for (let end = pos + 1; end <= reading.length; end++) if (set.has(reading.slice(pos, end)) && ok(i + 1, end)) return true;
    return false;
  };
  return chars.length > 0 && ok(0, 0);
}

/** True when the text is only kana (and ー). */
export const isKanaText = (s: string) => [...s].every(isKana);
