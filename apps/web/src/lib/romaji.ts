/**
 * Romaji of a kana text, for the kana stage only (later stages show kana and
 * furigana). Built from the course's kana table (data/kana.json, Hepburn) and
 * spelled after the kana, so that each kana maps to letters the learner can
 * see: がっこう → gakkou, コーヒー → koohii, きんえん → kin'en.
 */
import type { KanaEntry } from '@j-learn-write/course';

const SMALL_TSU = new Set(['っ', 'ッ']);
const N = new Set(['ん', 'ン']);
const LONG = 'ー';

export type RomajiTable = ReadonlyMap<string, string>;

export function romajiTable(kana: readonly KanaEntry[]): RomajiTable {
  return new Map(kana.filter((k) => k.romaji).map((k) => [k.kana, k.romaji]));
}

/** Romaji of `text`; characters outside the table are kept as they are. */
export function romanize(text: string, table: RomajiTable): string {
  const chars = [...text];
  let out = '';
  let geminate = false;
  for (let i = 0; i < chars.length; ) {
    const ch = chars[i]!;
    if (SMALL_TSU.has(ch)) {
      geminate = true;
      i++;
      continue;
    }
    if (ch === LONG) {
      const vowel = /[aeiou](?=[^aeiou]*$)/.exec(out)?.[0];
      out += vowel && /[aeiou]$/.test(out) ? vowel : '';
      i++;
      continue;
    }
    const pair = chars.slice(i, i + 2).join('');
    let syllable = chars.length - i >= 2 ? table.get(pair) : undefined;
    let width = 2;
    if (syllable === undefined) {
      syllable = table.get(ch);
      width = 1;
    }
    if (syllable === undefined) {
      out += ch;
      geminate = false;
      i++;
      continue;
    }
    if (N.has(ch)) {
      const next = romanize(chars.slice(i + 1, i + 3).join(''), table);
      out += /^[aeiouy]/.test(next) ? "n'" : 'n';
      i++;
      continue;
    }
    if (geminate && /^[a-z]/.test(syllable) && !/^[aeiou]/.test(syllable)) {
      out += syllable.startsWith('ch') ? 't' : syllable[0];
    }
    geminate = false;
    out += syllable;
    i += width;
  }
  return out;
}
