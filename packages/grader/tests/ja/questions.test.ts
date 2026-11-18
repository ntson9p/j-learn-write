import { describe, expect, it } from 'vitest';
import type { CountQuestion, LocationQuestion } from '../../src/core/types';
import { gradeJaCount } from '../../src/lang/ja/count';
import { gradeJaLocation } from '../../src/lang/ja/location';

const pencils: CountQuestion = { id: 'c', lang: 'ja', type: 'count', prompt: '鉛筆は何本ありますか。', expected: { number: 3, noun: '鉛筆', sentence: '鉛筆は3本あります。' } };
const count = (a: string, q: CountQuestion = pencils) => {
  const r = gradeJaCount(q, a);
  return { score: r.score, status: r.content.status, codes: r.issues.map((i) => i.code) };
};

describe('count questions', () => {
  it('accepts the number with its counter, in any spelling', () => {
    for (const a of ['鉛筆は3本あります。', '3本あります。', '三本です。', 'さんぼんです', 'えんぴつはさんぼんあります', '３本']) expect(count(a), a).toMatchObject({ score: 100, status: 'correct' });
  });

  it('reads slips of the counter and takes points off', () => {
    expect(count('さんほんあります')).toMatchObject({ score: 90, status: 'correct', codes: ['counter_reading'] });
    expect(count('3枚あります。')).toMatchObject({ score: 80, status: 'correct', codes: ['wrong_counter'] });
    expect(count('3です。')).toMatchObject({ score: 80, status: 'correct', codes: ['missing_counter'] });
  });

  it('grades the content: wrong number, negation, several numbers, nothing', () => {
    expect(count('2本あります。')).toMatchObject({ status: 'wrong', score: 20 });
    expect(count('3本ありません。')).toMatchObject({ status: 'wrong' });
    expect(count('3本じゃありません。')).toMatchObject({ status: 'wrong' });
    expect(count('3本ない。')).toMatchObject({ status: 'wrong' });
    expect(count('2本か3本あります。')).toMatchObject({ status: 'wrong' });
    expect(count('鉛筆があります。')).toMatchObject({ status: 'no_answer', score: 0 });
    expect(count('本が3冊あります。')).toMatchObject({ status: 'wrong' });
    expect(count('sanbon')).toMatchObject({ status: 'no_answer' });
  });

  it('counts people with 人 and small things with つ', () => {
    const students: CountQuestion = { id: 's', lang: 'ja', type: 'count', prompt: '学生は何人いますか。', expected: { number: 2, noun: '学生' } };
    expect(count('二人います。', students)).toMatchObject({ score: 100 });
    expect(count('ふたりです', students)).toMatchObject({ score: 100 });
    expect(count('2つです。', students).codes).toEqual(['wrong_counter']);
    const apples: CountQuestion = { id: 'a', lang: 'ja', type: 'count', prompt: 'りんごはいくつありますか。', expected: { number: 4, noun: 'りんご', counter: 'つ' } };
    expect(count('四つあります。', apples)).toMatchObject({ score: 100 });
    expect(count('よっつです', apples)).toMatchObject({ score: 100 });
    expect(count('5つです', apples)).toMatchObject({ status: 'wrong' });
  });
});

const cat: LocationQuestion = { id: 'l', lang: 'ja', type: 'location', prompt: '猫はどこにいますか。', expected: { places: ['机'], position: '下', sentence: '猫は机の下にいます。' } };
const where = (a: string, q: LocationQuestion = cat) => {
  const r = gradeJaLocation(q, a);
  return { score: r.score, status: r.content.status, codes: r.issues.map((i) => i.code) };
};

describe('location questions', () => {
  it('accepts the place with its position, in kanji or kana', () => {
    for (const a of ['猫は机の下にいます。', '机の下にいます。', '机の下です。', 'つくえのしたにいます']) expect(where(a), a).toMatchObject({ score: 100, status: 'correct' });
  });

  it('takes points off for Vietnamese word order, a missing position, あります for an animal', () => {
    expect(where('下の机にいます。')).toMatchObject({ status: 'correct', codes: ['position_order'] });
    expect(where('机にいます。')).toMatchObject({ status: 'correct', codes: ['missing_position'] });
    expect(where('猫は机の下にあります。')).toMatchObject({ score: 80, status: 'correct', codes: ['aru_iru'] });
  });

  it('grades the content: other place, other position, negation, nothing', () => {
    expect(where('いすの下にいます。')).toMatchObject({ status: 'wrong' });
    expect(where('机の上にいます。')).toMatchObject({ status: 'wrong' });
    expect(where('机の下にいません。')).toMatchObject({ status: 'wrong' });
    expect(where('猫がいます。')).toMatchObject({ status: 'no_answer' });
  });

  it('grades only the language when any place is right', () => {
    const lunch: LocationQuestion = { id: 'p', lang: 'ja', type: 'location', prompt: 'どこで昼ご飯を食べますか。', expected: {} };
    expect(where('食堂で食べます。', lunch)).toMatchObject({ status: 'correct', score: 100 });
    expect(where('東京です。', lunch)).toMatchObject({ status: 'correct' });
    expect(where('レストランで食べませんでした。', lunch)).toMatchObject({ status: 'wrong' });
  });

  it('takes points off for で where something is, and for で with 住む', () => {
    const dict: LocationQuestion = { id: 'd', lang: 'ja', type: 'location', prompt: '辞書はどこにありますか。', expected: { places: ['机'], position: '上' } };
    expect(where('机の上であります。', dict)).toMatchObject({ status: 'correct', score: 80, codes: ['ni_de'] });
    const home: LocationQuestion = { id: 'h', lang: 'ja', type: 'location', prompt: 'どこに住んでいますか。', expected: { places: ['ハノイ'] } };
    expect(where('ハノイで住んでいます。', home)).toMatchObject({ status: 'correct', score: 80, codes: ['ni_de'] });
    expect(where('ハノイに住んでいます。', home)).toMatchObject({ status: 'correct', score: 100 });
  });
});
