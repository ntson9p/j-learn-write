import { CHOON, isKana } from './kana.ts';

export interface JaNormalized {
  /** The cleaned answer; every issue span refers to this text. */
  text: string;
  /** True when the answer contains Latin letters (typed without a Japanese input method). */
  hasLatin: boolean;
}

/** Invisible format characters: zero-width space/joiners, BOM, bidi marks... */
const FORMAT_CHARS = /\p{Cf}/gu;
/** One or more line breaks, with the spaces around them. */
const LINE_BREAKS = /\s*[\r\n\p{Zl}\p{Zp}]+\s*/gu;
/** Dash-like characters that learners type for the prolonged sound mark ー after kana. */
const DASHES = new Set(['-', String.fromCharCode(0x2010), String.fromCharCode(0x2012), String.fromCharCode(0x2013), String.fromCharCode(0x2014), String.fromCharCode(0x2015), String.fromCharCode(0x2212)]);
/** ASCII punctuation produced by NFKC from full-width forms, mapped back to Japanese punctuation. */
const PUNCTUATION: Record<string, string> = {
  ',': String.fromCharCode(0x3001), // 、
  '!': String.fromCharCode(0xff01), // ！
  '?': String.fromCharCode(0xff1f), // ？
};
const FULL_STOP = String.fromCharCode(0x3002); // 。
const COMMA = String.fromCharCode(0x3001); // 、

/**
 * Cleans a learner answer:
 * - Unicode NFKC: full-width digits and Latin letters become ASCII, half-width katakana
 *   (ｶﾞ) become full-width (ガ), compatibility ideographs become unified ones
 * - invisible format characters removed
 * - line breaks inside the answer become 、 so that clauses stay apart
 * - all other whitespace removed (Japanese does not separate words with spaces)
 * - ASCII , . ! ? become 、 。 ！ ？ (a dot between digits is kept: 3.5; a comma
 *   between digits that separates thousands is dropped: 8,600 → 8600)
 * - a dash right after kana becomes ー (コ-ヒ- → コーヒー)
 */
export function normalizeJa(input: string): JaNormalized {
  let text = input.normalize('NFKC');
  text = text.replace(FORMAT_CHARS, '');
  text = text.trim().replace(LINE_BREAKS, COMMA);
  text = text.replace(/\s+/gu, '');
  const chars = [...text];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const prev = chars[i - 1];
    if (DASHES.has(ch) && isKana(prev)) out += CHOON;
    else if (ch === '.') out += /\d/.test(prev ?? '') && /\d/.test(chars[i + 1] ?? '') ? '.' : FULL_STOP;
    // A thousands separator (8,600) is dropped: 8600.
    else if (ch === ',' && /\d/.test(prev ?? '') && /^\d{3}(?!\d)/.test(chars.slice(i + 1, i + 5).join(''))) continue;
    else out += PUNCTUATION[ch] ?? ch;
  }
  return { text: out, hasLatin: /[A-Za-z]/.test(out) };
}
