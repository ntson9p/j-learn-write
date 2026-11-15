import { courseLexicon } from '@j-learn-write/grader';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alignReading, buildRuby, parseRuby, readingsOfKanji, rubyReading, rubyText, runReadingOk, splitWithDictionary } from '../src/furigana';
import type { ListWord } from '../src/types';

const vocabulary = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'jlpt', 'vocabulary.json'), 'utf8')) as ListWord[];
const kanjidic = JSON.parse(readFileSync(join(__dirname, '..', 'sources', 'kanjidic2', 'kanji.json'), 'utf8')) as { char: string; on: string[]; kun: string[] }[];
const rubyOf = new Map(vocabulary.map((w) => [w.no, w.ruby]));
const lex = courseLexicon([{ ja: 'グエン', reading: 'グエン' }]);
const fill = (text: string, previous?: string) => buildRuby(text, lex, (no) => rubyOf.get(no), previous);
const readings = new Map(kanjidic.map((k) => [k.char, readingsOfKanji(k)]));
const ok = (text: string, rt: string) => runReadingOk(text, rt, (c) => readings.get(c));

describe('ruby markup', () => {
  it('parses and prints markup', () => {
    const m = '{学|がく}{生|せい}です。';
    expect(parseRuby(m)).toEqual([{ text: '学', rt: 'がく' }, { text: '生', rt: 'せい' }, { text: 'です。' }]);
    expect(rubyText(m)).toBe('学生です。');
    expect(rubyReading(m)).toBe('がくせいです。');
  });

  it('aligns written forms with readings on their kana', () => {
    expect(alignReading('食べました', 'たべました')).toEqual([{ text: '食', rt: 'た' }, { text: 'べました' }]);
    expect(alignReading('お茶', 'おちゃ')).toEqual([{ text: 'お' }, { text: '茶', rt: 'ちゃ' }]);
    expect(alignReading('食べる', 'のむ')).toBeNull();
    expect(splitWithDictionary({ text: '学生', rt: 'がくせい' }, parseRuby('{学|がく}{生|せい}'))).toEqual([
      { text: '学', rt: 'がく' },
      { text: '生', rt: 'せい' },
    ]);
  });
});

describe('buildRuby', () => {
  it('fills furigana from the course words', () => {
    expect(fill('私は学生です。')).toEqual({ markup: '{私|わたし}は{学|がく}{生|せい}です。', problems: [] });
    expect(fill('毎朝パンを食べました。').markup).toBe('{毎|まい}{朝|あさ}パンを{食|た}べました。');
    expect(fill('今日は大人が来ます。').markup).toBe('{今日|きょう}は{大人|おとな}が{来|き}ます。');
    expect(fill('鉛筆が三本あります。').markup).toBe('{鉛|えん}{筆|ぴつ}が{三本|さんぼん}あります。');
  });

  it('puts furigana on the counter after digits', () => {
    expect(fill('鉛筆が3本あります。').markup).toBe('{鉛|えん}{筆|ぴつ}が3{本|ぼん}あります。');
    expect(fill('1本です。').markup).toBe('1{本|ぽん}です。');
    expect(fill('1人です。').markup).toBe('{1人|ひとり}です。');
    expect(fill('20日です。').markup).toBe('{20日|はつか}です。');
    expect(fill('3時です。').markup).toBe('3{時|じ}です。');
  });

  it('reports ambiguous readings instead of guessing, and keeps an author choice', () => {
    const r = fill('雨が降ります。');
    expect(r.problems).toEqual([{ surface: '降ります', message: 'ambiguous reading (おります / ふります): choose one in the markup' }]);
    expect(r.markup).toBe('{雨|あめ}が降ります。');
    expect(fill('雨が降ります。', '{雨|あめ}が{降|ふ}ります。')).toEqual({ markup: '{雨|あめ}が{降|ふ}ります。', problems: [] });
    // A previous choice that is not a candidate is not used.
    expect(fill('雨が降ります。', '{雨|あめ}が{降|ぐ}ります。').problems).toHaveLength(1);
  });

  it('reports kanji it does not know', () => {
    expect(fill('犬が吠えます。').problems.map((p) => p.surface)).toEqual(['吠']);
  });

  it('reads 私 and 何 by context, only in clear cases', () => {
    expect(fill('私は何を食べますか。').markup).toBe('{私|わたし}は{何|なに}を{食|た}べますか。');
    expect(fill('これは何ですか。').markup).toBe('これは{何|なん}ですか。');
    expect(fill('何に乗りますか。').problems.map((p) => p.surface)).toEqual(['何']);
  });
});

describe('kanji readings (KANJIDIC2)', () => {
  it('accepts readings with sound changes', () => {
    expect([ok('学', 'がく'), ok('学', 'がっ'), ok('本', 'ぼん'), ok('本', 'ぽん'), ok('一', 'いっ'), ok('食', 'た'), ok('人', 'じん')]).toEqual([true, true, true, true, true, true, true]);
    expect(ok('学生', 'がくせい')).toBe(true);
    expect(ok('時々', 'ときどき')).toBe(true);
  });

  it('rejects wrong readings', () => {
    expect([ok('学', 'せい'), ok('学生', 'がくせ'), ok('今日', 'きょう')]).toEqual([false, false, false]);
  });
});
