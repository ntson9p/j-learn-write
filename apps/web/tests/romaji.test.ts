import { loadKana } from '@j-learn-write/course';
import { describe, expect, it } from 'vitest';
import { romajiTable, romanize } from '../src/lib/romaji';

describe('romanize', async () => {
  const table = romajiTable(await loadKana());

  it('follows the kana spelling', () => {
    expect(romanize('あき', table)).toBe('aki');
    expect(romanize('おかあさん', table)).toBe('okaasan');
    expect(romanize('とうきょう', table)).toBe('toukyou');
    expect(romanize('しんぶん', table)).toBe('shinbun');
    expect(romanize('ぢ', table)).toBe('ji');
  });

  it('doubles the consonant after a small tsu', () => {
    expect(romanize('がっこう', table)).toBe('gakkou');
    expect(romanize('きって', table)).toBe('kitte');
    expect(romanize('まっちゃ', table)).toBe('matcha');
  });

  it("separates n from a following vowel or y with '", () => {
    expect(romanize('きんえん', table)).toBe("kin'en");
    expect(romanize('ほんや', table)).toBe("hon'ya");
    expect(romanize('ほん', table)).toBe('hon');
  });

  it('lengthens the vowel before ー and reads extended katakana from the table', () => {
    expect(romanize('コーヒー', table)).toBe('koohii');
    expect(romanize('パーティー', table)).toBe('paatii');
    expect(romanize('ヴァイオリン', table)).toBe('vaiorin');
    expect(romanize('ファイル', table)).toBe('fairu');
  });

  it('keeps characters it does not know', () => {
    expect(romanize('あ、い。', table)).toBe('a、i。');
  });
});
