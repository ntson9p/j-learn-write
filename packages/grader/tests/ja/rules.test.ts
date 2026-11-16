/**
 * Every rule: sentences it must catch (with the fix) and correct sentences it
 * must leave alone. The whole course is checked too (course package,
 * tests/content.test.ts): no rule may flag a correct course sentence.
 */
import { describe, expect, it } from 'vitest';
import { applyFixes } from '../../src/core/fixes';
import { checkJaSentence } from '../../src/lang/ja/check';

const codes = (s: string) => checkJaSentence(s).issues.map((i) => i.code);
function fixed(s: string): string {
  const { normalized, issues } = checkJaSentence(s);
  return applyFixes(normalized, issues.flatMap((i) => (i.fix ? [i.fix] : []))).text;
}

describe('rules', () => {
  it('te_form: a group I verb stem with て/た', () => {
    expect(fixed('ここに書きてください。')).toBe('ここに書いてください。');
    expect(fixed('昨日、東京へ行きました。そして、映画を見に行きた。')).toContain('行った');
    expect(fixed('本を読みでいます。')).toBe('本を読んでいます。');
    expect(fixed('かきてください。')).toBe('かいてください。');
    for (const ok of ['ここに書いてください。', '食べてください。', '起きています。', '書き手', '見てください。', 'してください。', '来てください。', '今日は休みです。', '明日は休みで、あさっては仕事です。', '日本へ行きたいです。']) expect(codes(ok), ok).toEqual([]);
  });

  it('adjective_form: い-adjectives conjugated like nouns, な-adjectives like い-adjectives', () => {
    expect(fixed('この本は高いじゃありません。')).toBe('この本は高くありません。');
    expect(fixed('昨日は寒いでした。')).toBe('昨日は寒かったです。');
    expect(fixed('いいじゃないです。')).toBe('よくないです。');
    expect(fixed('高いな本です。')).toBe('高い本です。');
    expect(fixed('有名の人です。')).toBe('有名な人です。');
    for (const ok of ['高くありません。', '寒かったです。', '静かな部屋です。', '高いな。', '病気の人です。', '元気じゃありません。', 'きれいじゃない。']) expect(codes(ok), ok).toEqual([]);
  });

  it('wh_wa: a question word as subject takes が', () => {
    expect(fixed('誰は来ましたか。')).toBe('誰が来ましたか。');
    expect(fixed('何は好きですか。')).toBe('何が好きですか。');
    for (const ok of ['先生は誰ですか。', '誰が来ましたか。', 'これは何ですか。']) expect(codes(ok), ok).toEqual([]);
  });

  it('particle_kana: particles written as they sound', () => {
    expect(fixed('私わ学生です。')).toBe('私は学生です。');
    expect(fixed('本お読みます。')).toBe('本を読みます。');
    for (const ok of ['私は学生です。', 'お茶をください。', '本を読みます。', 'お名前は何ですか。']) expect(codes(ok), ok).toEqual([]);
  });

  it('aru_iru: people and animals いる, things ある', () => {
    expect(fixed('猫があります。')).toBe('猫がいます。');
    expect(fixed('部屋に田中さんがありません。')).toBe('部屋に田中さんがいません。');
    expect(fixed('机の上に本がいます。')).toBe('机の上に本があります。');
    for (const ok of ['猫がいます。', '本があります。', '時間があります。', 'パーティーがあります。', 'お金がいります。']) expect(codes(ok), ok).toEqual([]);
  });

  it('ni_de: place of an action で, place of being に', () => {
    expect(fixed('図書館に勉強します。')).toBe('図書館で勉強します。');
    expect(fixed('レストランに昼ご飯を食べます。')).toBe('レストランで昼ご飯を食べます。');
    expect(fixed('部屋でいます。')).toBe('部屋にいます。');
    for (const ok of ['図書館で勉強します。', '公園に遊びに行きます。', '学校に行きます。', '部屋にいます。', 'パーティーが学校であります。', '先生に聞きます。', '部屋で寝ています。'])
      expect(codes(ok), ok).toEqual([]);
  });

  it('counters: wrong counter, missing counter, reading without sound change', () => {
    expect(fixed('鉛筆が3枚あります。')).toBe('鉛筆が3本あります。');
    expect(codes('三本の本があります。')).toEqual(['wrong_counter']);
    expect(codes('学生が三ついます。')).toEqual(['wrong_counter']);
    expect(codes('三りんごをください。')).toEqual([]); // りんご has no listed counter: silent
    expect(codes('3鉛筆があります。')).toEqual(['missing_counter']);
    expect(fixed('えんぴつがさんほんあります。')).toBe('えんぴつがさんぼんあります。');
    expect(fixed('いちほん')).toBe('いっぽん');
    for (const ok of ['鉛筆が3本あります。', 'この傘は500円です。', '大人は300円です。', 'りんごを三つください。', '本を2冊買いました。', '鉛筆を三つください。', '学生が3人います。', 'にほんあります。', '日本へ行きます。'])
      expect(codes(ok), ok).toEqual([]);
  });
});
