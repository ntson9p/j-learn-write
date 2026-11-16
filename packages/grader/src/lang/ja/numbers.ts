/**
 * Japanese numbers and counters: value of a written number, its reading, and
 * the readings of number + counter with their sound changes (三本 さんぼん,
 * 一本 いっぽん, 六分 ろっぷん…). Readings are built by rules on the last
 * number word; irregular counters (人, 日, つ, 時, 月…) list their exceptions.
 * The first reading of a list is the usual one.
 */

const DIGITS: Record<string, number> = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
const MAN = '万';

/**
 * Value of a number written in kanji (二十三, 三千五百, 一万), digits (23,
 * 30,000) or digits with kanji units (3万, 2千). Null when not a number.
 */
export function numberValue(text: string): number | null {
  if (/^\d+$/.test(text)) return Number(text);
  if (/^\d{1,3}(,\d{3})+$/.test(text)) return Number(text.replace(/,/g, ''));
  if (/^\d+$/.test(text.replace(/[十百千万]/g, '')) && /\d/.test(text) && /^\d/.test(text)) return mixedValue(text);
  if (text === '' || ![...text].every((c) => c in DIGITS || c in UNITS || c === MAN)) return null;
  // Digit-by-digit form (二〇二六) has no units.
  if (![...text].some((c) => c in UNITS || c === MAN)) return Number([...text].map((c) => DIGITS[c]).join(''));
  let total = 0;
  let section = 0;
  let digit: number | null = null;
  for (const c of text) {
    if (c in DIGITS) {
      if (digit !== null) return null;
      digit = DIGITS[c]!;
    } else if (c in UNITS) {
      section += (digit ?? 1) * UNITS[c]!;
      digit = null;
    } else {
      total += (section + (digit ?? 0) || 1) * 10000;
      section = 0;
      digit = null;
    }
  }
  return total + section + (digit ?? 0);
}

/** Digits with kanji units (3万, 3万5000, 2千): each run of digits is the multiplier of the unit after it. */
function mixedValue(text: string): number | null {
  let total = 0;
  let section = 0;
  let digit: number | null = null;
  for (const m of text.matchAll(/\d+|[十百千万]/g)) {
    const t = m[0];
    if (/\d/.test(t)) {
      if (digit !== null) return null;
      digit = Number(t);
    } else if (t === MAN) {
      total += (section + (digit ?? 0) || 1) * 10000;
      section = 0;
      digit = null;
    } else {
      if (digit !== null && digit > 9) return null;
      section += (digit ?? 1) * UNITS[t]!;
      digit = null;
    }
  }
  return total + section + (digit ?? 0);
}

/** Number words of a value, e.g. 23 → ["に", "じゅう", "さん"]; 0 → ["ゼロ"]. */
function numberWords(n: number): string[] {
  if (n === 0) return ['ゼロ'];
  const out: string[] = [];
  const ONES = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
  const man = Math.floor(n / 10000);
  if (man > 0) out.push(...numberWords(man), 'まん');
  const rest = n % 10000;
  const th = Math.floor(rest / 1000);
  const hu = Math.floor((rest % 1000) / 100);
  const te = Math.floor((rest % 100) / 10);
  const on = rest % 10;
  if (th > 0) out.push(...({ 1: ['せん'], 3: ['さんぜん'], 8: ['はっせん'] } as Record<number, string[]>)[th] ?? [ONES[th]!, 'せん']);
  if (hu > 0) out.push(...({ 1: ['ひゃく'], 3: ['さんびゃく'], 6: ['ろっぴゃく'], 8: ['はっぴゃく'] } as Record<number, string[]>)[hu] ?? [ONES[hu]!, 'ひゃく']);
  if (te > 0) out.push(...(te === 1 ? ['じゅう'] : [ONES[te]!, 'じゅう']));
  if (on > 0) out.push(ONES[on]!);
  return out;
}

/** Reading of a number said alone (counting, prices without 円…). */
export function numberReading(n: number): string {
  return numberWords(n).join('');
}

/**
 * Sound-change groups of counters by their first consonant:
 * - hb: h-; p after a small っ, b after ん (本 ほん: いっぽん, さんぼん)
 * - hp: h-; p after っ and after ん, also after よん (分 ふん: いっぷん, さんぷん, よんぷん)
 * - k:  k-; small っ after 1, 6, 8, 10, 100 (個 こ: いっこ, ろっこ)
 * - kg: like k, g after ん (階 かい: さんがい)
 * - s:  s-; small っ after 1, 8, 10 (冊 さつ: いっさつ)
 * - sz: like s, z after ん (足 そく: さんぞく)
 * - plain: no change (枚, 台, 番)
 */
export type CounterGroup = 'hb' | 'hp' | 'k' | 'kg' | 's' | 'sz' | 'plain';

export interface Counter {
  /** Written counter, e.g. 本. */
  counter: string;
  /** Reading of the counter, e.g. ほん. */
  reading: string;
  group: CounterGroup;
  /** Readings that replace the rule, by number (and "何"); first one is usual. */
  special?: Record<string, string[]>;
  /** Other written forms of the counter (ヶ月 for か月). */
  forms?: string[];
  /** Digits whose special reading also ends longer numbers (人: ["4", "7"] for 十四人 じゅうよにん). */
  tail?: string[];
  /** What is counted, in Vietnamese (for messages). */
  vi: string;
}

const H_TO_P: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' };
const H_TO_B: Record<string, string> = { は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
const K_TO_G: Record<string, string> = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご' };
const S_TO_Z: Record<string, string> = { さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ' };

/**
 * Kana a counter may be written with after digits (3ぼん, 10ぷん, 4じ): its
 * reading with or without the sound change of its first kana.
 */
export function counterKanaAfterDigits(c: Counter): string[] {
  if (![...c.reading].every((ch) => /[ぁ-ゖ]/u.test(ch))) return [];
  const first = c.reading[0]!;
  const tail = c.reading.slice(1);
  const changed = [H_TO_P[first], H_TO_B[first], K_TO_G[first], S_TO_Z[first]].filter((x): x is string => !!x).map((x) => x + tail);
  return [...new Set([c.reading, ...changed])];
}

/**
 * The reading of a number + counter without its sound change (さんほん for
 * 3本, きゅうがつ for 9月), when it is not a right reading; empty when it is,
 * and for spellings that are mostly something else: つ (につ = に + 着く),
 * short ones, さん + は… (田中さんはくに: さん + は, not 三泊) unless `withSan`
 * (the caller then checks that さん is not a suffix).
 */
export function naiveCounterReading(n: number, c: Counter, withSan = false): string {
  const naive = numberReading(n) + c.reading;
  if (c.counter === 'つ' || naive.length < 3 || (!withSan && /さん[はひふへほ]/u.test(naive))) return '';
  return counterReadings(n, c).includes(naive) ? '' : naive;
}

/** Readings of the last number word + counter, the first being the usual one. */
function joinLast(last: string, c: Counter): string[] {
  const first = c.reading[0]!;
  const tail = c.reading.slice(1);
  const geminate = (stem: string) => `${stem}っ`;
  const pWord = (stem: string) => geminate(stem) + (H_TO_P[first] ?? first) + tail;
  switch (c.group) {
    case 'hb':
    case 'hp': {
      if (last === 'いち') return [pWord('い')];
      if (last === 'ろく') return [pWord('ろ')];
      if (last === 'はち') return [pWord('は'), `はち${c.reading}`];
      if (last === 'じゅう') return [pWord('じゅ'), pWord('じ')];
      if (last === 'ひゃく') return [pWord('ひゃ')];
      if (last.endsWith('ん')) {
        if (c.group === 'hb' && last !== 'よん') return [last + (H_TO_B[first] ?? first) + tail];
        if (c.group === 'hp') return [last + (H_TO_P[first] ?? first) + tail];
      }
      return [last + c.reading];
    }
    case 'k':
    case 'kg': {
      if (last === 'いち') return [`いっ${c.reading}`];
      if (last === 'ろく') return [`ろっ${c.reading}`];
      if (last === 'はち') return [`はっ${c.reading}`, `はち${c.reading}`];
      if (last === 'じゅう') return [`じゅっ${c.reading}`, `じっ${c.reading}`];
      if (last === 'ひゃく') return [`ひゃっ${c.reading}`];
      if (c.group === 'kg' && last.endsWith('ん') && last !== 'よん') return [last + (K_TO_G[first] ?? first) + tail];
      return [last + c.reading];
    }
    case 's':
    case 'sz': {
      if (last === 'いち') return [`いっ${c.reading}`];
      if (last === 'はち') return [`はっ${c.reading}`, `はち${c.reading}`];
      if (last === 'じゅう') return [`じゅっ${c.reading}`, `じっ${c.reading}`];
      if (c.group === 'sz' && last.endsWith('ん') && last !== 'よん') return [last + (S_TO_Z[first] ?? first) + tail];
      return [last + c.reading];
    }
    default:
      return [last + c.reading];
  }
}

/**
 * Readings of a number (or "何" when `n` is null) with a counter, usual first:
 * counterReadings(3, 本) → ["さんぼん"], counterReadings(8, 本) → ["はっぽん", "はちほん"].
 */
export function counterReadings(n: number | null, c: Counter): string[] {
  const key = n === null ? '何' : String(n);
  if (c.special?.[key]) return c.special[key]!;
  const words = n === null ? ['なん'] : numberWords(n);
  // Some special readings of a last digit also apply inside longer numbers (十四人 じゅうよにん, 二十四日 にじゅうよっか).
  if (n !== null && n > 10 && c.tail) {
    const lastDigit = String(n % 10);
    if (c.tail.includes(lastDigit) && c.special?.[lastDigit]) {
      const prefix = numberWords(n - (n % 10)).join('');
      return c.special[lastDigit]!.map((r) => prefix + r);
    }
  }
  const last = words.at(-1)!;
  const prefix = words.slice(0, -1).join('');
  return joinLast(last, c).map((r) => prefix + r);
}

import countersFile from './data/counters.json' with { type: 'json' };

/** The counters of the course (data/counters.json). */
export const COUNTERS: readonly Counter[] = countersFile.counters as Counter[];

/** A counter by any of its written forms. */
export function findCounter(text: string): Counter | undefined {
  return COUNTERS.find((c) => c.counter === text || c.forms?.includes(text));
}
