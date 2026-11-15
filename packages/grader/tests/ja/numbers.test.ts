import { describe, expect, it } from 'vitest';
import { counterReadings, findCounter, numberReading, numberValue } from '../../src/lang/ja/numbers';

const r = (n: number | null, counter: string) => counterReadings(n, findCounter(counter)!);

describe('numbers', () => {
  it('reads written numbers', () => {
    expect(['一', '十', '十一', '二十三', '百', '三百五', '千', '三千五百', '一万', '二万三千', '23', '二〇二六'].map(numberValue)).toEqual([
      1, 10, 11, 23, 100, 305, 1000, 3500, 10000, 23000, 23, 2026,
    ]);
    expect(numberValue('一二十')).toBeNull();
    expect(numberValue('二つ')).toBeNull();
  });

  it('says numbers', () => {
    expect([1, 4, 7, 9, 10, 14, 300, 600, 800, 3000, 8000, 10000, 2026].map(numberReading)).toEqual([
      'いち', 'よん', 'なな', 'きゅう', 'じゅう', 'じゅうよん', 'さんびゃく', 'ろっぴゃく', 'はっぴゃく', 'さんぜん', 'はっせん', 'いちまん', 'にせんにじゅうろく',
    ]);
  });
});

describe('counters', () => {
  it('applies the sound changes of 本 (h → p / b)', () => {
    expect([1, 2, 3, 4, 6, 8, 10, 11, 13, 100, 1000].map((n) => r(n, '本')[0])).toEqual([
      'いっぽん', 'にほん', 'さんぼん', 'よんほん', 'ろっぽん', 'はっぽん', 'じゅっぽん', 'じゅういっぽん', 'じゅうさんぼん', 'ひゃっぽん', 'せんぼん',
    ]);
    expect(r(8, '本')).toEqual(['はっぽん', 'はちほん']);
    expect(r(null, '本')).toEqual(['なんぼん']);
    expect([1, 3, 6, null].map((n) => r(n, '匹')[0])).toEqual(['いっぴき', 'さんびき', 'ろっぴき', 'なんびき']);
    expect([1, 3].map((n) => r(n, '杯')[0])).toEqual(['いっぱい', 'さんばい']);
  });

  it('reads 分 with p after ん', () => {
    expect([1, 2, 3, 4, 5, 6, 10, null].map((n) => r(n, '分')[0])).toEqual(['いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'じゅっぷん', 'なんぷん']);
  });

  it('applies gemination to k and s counters', () => {
    expect([1, 3, 6, 8, 10].map((n) => r(n, '個')[0])).toEqual(['いっこ', 'さんこ', 'ろっこ', 'はっこ', 'じゅっこ']);
    expect([1, 3, null].map((n) => r(n, '階')[0])).toEqual(['いっかい', 'さんがい', 'なんがい']);
    expect([1, 6, 8].map((n) => r(n, '冊')[0])).toEqual(['いっさつ', 'ろくさつ', 'はっさつ']);
    expect([1, 3].map((n) => r(n, '足')[0])).toEqual(['いっそく', 'さんぞく']);
    expect(r(1, 'ヶ月')).toEqual(['いっかげつ']);
  });

  it('reads the irregular counters', () => {
    expect([1, 2, 3, 4, 7, 10, null].map((n) => r(n, 'つ')[0])).toEqual(['ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'ななつ', 'とお', 'いくつ']);
    expect([1, 2, 3, 4, 11, 14, 17].map((n) => r(n, '人')[0])).toEqual(['ひとり', 'ふたり', 'さんにん', 'よにん', 'じゅういちにん', 'じゅうよにん', 'じゅうななにん']);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 17, 20, 24, 30].map((n) => r(n, '日')[0])).toEqual([
      'ついたち', 'ふつか', 'みっか', 'よっか', 'いつか', 'むいか', 'なのか', 'ようか', 'ここのか', 'とおか', 'じゅういちにち', 'じゅうよっか', 'じゅうしちにち', 'はつか', 'にじゅうよっか', 'さんじゅうにち',
    ]);
    expect([4, 7, 9, 11].map((n) => r(n, '月')[0])).toEqual(['しがつ', 'しちがつ', 'くがつ', 'じゅういちがつ']);
    expect([4, 7, 9, 14].map((n) => r(n, '時')[0])).toEqual(['よじ', 'しちじ', 'くじ', 'じゅうよじ']);
    expect([4, 14].map((n) => r(n, '円')[0])).toEqual(['よえん', 'じゅうよえん']);
    expect(r(20, '歳')).toEqual(['はたち', 'にじゅっさい']);
    expect(r(8, '歳')[0]).toBe('はっさい');
  });
});
