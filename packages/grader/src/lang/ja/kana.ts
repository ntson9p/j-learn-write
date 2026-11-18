/**
 * Character classes and kana conversions used by the Japanese pack.
 * Ranges come from the Unicode Hiragana and Katakana blocks; no table is typed by hand.
 */

const HIRAGANA_FIRST = 0x3041; // ぁ
const HIRAGANA_LAST = 0x3096; // ゖ
const KATAKANA_FIRST = 0x30a1; // ァ
const KATAKANA_LAST = 0x30f6; // ヶ
/** Distance between a katakana and the matching hiragana. */
const KANA_OFFSET = KATAKANA_FIRST - HIRAGANA_FIRST;
/** ー: the katakana-hiragana prolonged sound mark. */
export const CHOON = String.fromCharCode(0x30fc);
/** 々: the ideographic iteration mark, read as a repeated kanji. */
export const ITERATION_MARK = String.fromCharCode(0x3005);

const HAN = /\p{Script=Han}/u;
const LATIN = /[A-Za-z]/;

function code(ch: string | undefined): number {
  return ch === undefined || ch.length === 0 ? -1 : ch.codePointAt(0)!;
}

export function isHiragana(ch: string | undefined): boolean {
  const c = code(ch);
  return c >= HIRAGANA_FIRST && c <= HIRAGANA_LAST;
}

export function isKatakana(ch: string | undefined): boolean {
  const c = code(ch);
  return c >= KATAKANA_FIRST && c <= 0x30fa; // up to ヺ
}

/** Hiragana, katakana or the prolonged sound mark ー. */
export function isKana(ch: string | undefined): boolean {
  return isHiragana(ch) || isKatakana(ch) || ch === CHOON;
}

/** A kanji, including the iteration mark 々. */
export function isKanji(ch: string | undefined): boolean {
  return ch !== undefined && (ch === ITERATION_MARK || HAN.test(ch));
}

export function hasKanji(text: string): boolean {
  return [...text].some(isKanji);
}

/** Kana, kanji or ー: characters of Japanese words. */
export function isJapaneseChar(ch: string | undefined): boolean {
  return isKana(ch) || isKanji(ch);
}

export function hasJapanese(text: string): boolean {
  return [...text].some(isJapaneseChar);
}

export function isLatin(ch: string | undefined): boolean {
  return ch !== undefined && LATIN.test(ch);
}

export function hasLatin(text: string): boolean {
  return LATIN.test(text);
}

/** Katakana → hiragana (ヴ → ゔ; ー and other characters are kept). */
export function toHiragana(text: string): string {
  let out = '';
  for (const ch of text) {
    const c = code(ch);
    out += c >= KATAKANA_FIRST && c <= KATAKANA_LAST ? String.fromCodePoint(c - KANA_OFFSET) : ch;
  }
  return out;
}

/** Hiragana → katakana (other characters are kept). */
export function toKatakana(text: string): string {
  let out = '';
  for (const ch of text) {
    const c = code(ch);
    out += c >= HIRAGANA_FIRST && c <= HIRAGANA_LAST ? String.fromCodePoint(c + KANA_OFFSET) : ch;
  }
  return out;
}

/** True when the text is made only of kana (and ー). */
export function isAllKana(text: string): boolean {
  return text.length > 0 && [...text].every(isKana);
}
