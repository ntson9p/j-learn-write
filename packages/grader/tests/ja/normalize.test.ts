import { describe, expect, it } from 'vitest';
import { normalizeJa } from '../../src/lang/ja/normalize';

// Invisible and look-alike characters are built from their code points so the
// test source stays readable.
const IDEOGRAPHIC_SPACE = String.fromCharCode(0x3000);
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
const BOM = String.fromCharCode(0xfeff);
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const MINUS = String.fromCharCode(0x2212);
const HALF_WIDTH_KA_DAKUTEN = String.fromCharCode(0xff76, 0xff9e); // ｶﾞ
const FULL_WIDTH_QUESTION = String.fromCharCode(0xff1f);
const FULL_WIDTH_EXCLAMATION = String.fromCharCode(0xff01);

describe('normalizeJa', () => {
  it('keeps Japanese text and its punctuation', () => {
    expect(normalizeJa('私は学生です。')).toEqual({ text: '私は学生です。', hasLatin: false });
    expect(normalizeJa(`これは何ですか${FULL_WIDTH_QUESTION}`).text).toBe(`これは何ですか${FULL_WIDTH_QUESTION}`);
  });

  it('drops a thousands separator but keeps a decimal point', () => {
    expect(normalizeJa('8,600円です').text).toBe('8600円です');
    expect(normalizeJa('1,234,567円').text).toBe('1234567円');
    expect(normalizeJa('3.5キロ').text).toBe('3.5キロ');
    expect(normalizeJa('はい,そうです').text).toBe('はい、そうです');
    expect(normalizeJa('1,2個').text).toBe('1、2個');
  });

  it('removes spaces, including the ideographic space', () => {
    expect(normalizeJa(` 私は ${IDEOGRAPHIC_SPACE}学生です `).text).toBe('私は学生です');
  });

  it('keeps lines apart as clauses', () => {
    expect(normalizeJa('はい\nそうです').text).toBe('はい、そうです');
    expect(normalizeJa(`はい${LINE_SEPARATOR}そうです`).text).toBe('はい、そうです');
  });

  it('turns full-width digits and letters into ASCII and half-width katakana into full-width', () => {
    expect(normalizeJa('りんごが３つ').text).toBe('りんごが3つ');
    expect(normalizeJa('ＡＢｃ')).toEqual({ text: 'ABc', hasLatin: true });
    expect(normalizeJa(`${HALF_WIDTH_KA_DAKUTEN}ｲﾄﾞ`).text).toBe('ガイド');
  });

  it('maps ASCII punctuation to Japanese punctuation', () => {
    expect(normalizeJa('はい, そうです.').text).toBe('はい、そうです。');
    expect(normalizeJa('本当?すごい!').text).toBe(`本当${FULL_WIDTH_QUESTION}すごい${FULL_WIDTH_EXCLAMATION}`);
    expect(normalizeJa('3.5キロ').text).toBe('3.5キロ');
  });

  it('turns a dash after kana into the prolonged sound mark', () => {
    expect(normalizeJa('コ-ヒ-').text).toBe('コーヒー');
    expect(normalizeJa(`ス${MINUS}パ${MINUS}`).text).toBe('スーパー');
    expect(normalizeJa('A-B').text).toBe('A-B');
  });

  it('removes invisible format characters', () => {
    expect(normalizeJa(`${BOM}私${ZERO_WIDTH_SPACE}は`).text).toBe('私は');
  });

  it('flags answers typed in romaji', () => {
    expect(normalizeJa('watashi wa gakusei desu').hasLatin).toBe(true);
  });
});
