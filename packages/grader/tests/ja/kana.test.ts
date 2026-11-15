import { describe, expect, it } from 'vitest';
import { hasJapanese, hasKanji, isAllKana, isHiragana, isKana, isKanji, isKatakana, toHiragana, toKatakana } from '../../src/lang/ja/kana';

describe('kana helpers', () => {
  it('classifies characters', () => {
    expect([...'あゖァヺー漢々a1。'].map((c) => [isHiragana(c), isKatakana(c), isKana(c), isKanji(c)])).toEqual([
      [true, false, true, false],
      [true, false, true, false],
      [false, true, true, false],
      [false, true, true, false],
      [false, false, true, false],
      [false, false, false, true],
      [false, false, false, true],
      [false, false, false, false],
      [false, false, false, false],
      [false, false, false, false],
    ]);
    expect(isKana(undefined)).toBe(false);
    expect(isKanji('')).toBe(false);
  });

  it('converts between hiragana and katakana', () => {
    expect(toHiragana('コーヒーとヴァイオリン')).toBe('こーひーとゔぁいおりん');
    expect(toKatakana('きってとジュース')).toBe('キッテトジュース');
    expect(toHiragana('東京タワー')).toBe('東京たわー');
  });

  it('detects Japanese text', () => {
    expect(hasJapanese('Hello')).toBe(false);
    expect(hasJapanese('Hello世界')).toBe(true);
    expect(hasKanji('ひらがな')).toBe(false);
    expect(isAllKana('すし')).toBe(true);
    expect(isAllKana('寿司')).toBe(false);
    expect(isAllKana('')).toBe(false);
  });
});
