import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildJlptData, graderWords, jsonLines, kanjiOf } from '../src/jlpt-build';
import type { KanaEntry, ListGrammar, ListKanji, ListWord } from '../src/types';
import { loadBuildSources } from '../scripts/lib/sources';

const DATA = join(__dirname, '..', 'data');
const read = (path: string) => readFileSync(join(DATA, path), 'utf8');
const vocabulary = JSON.parse(read('jlpt/vocabulary.json')) as ListWord[];
const kanji = JSON.parse(read('jlpt/kanji.json')) as ListKanji[];
const grammar = JSON.parse(read('jlpt/grammar.json')) as ListGrammar[];
const kana = JSON.parse(read('kana.json')) as KanaEntry[];
const overrides = (JSON.parse(read('hanviet-overrides.json')) as { kanji: Record<string, string> }).kanji;
/** Kanji made in Japan, with no Hán Việt reading. */
const KOKUJI = Object.keys(overrides).filter((c) => overrides[c] === '');
const count = <T>(items: readonly T[], pred: (x: T) => boolean) => items.filter(pred).length;

/** Plain text and reading of a furigana markup string. */
function unruby(markup: string): { text: string; reading: string } {
  return {
    text: markup.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'),
    reading: markup.replace(/\{[^|}]+\|([^}]+)\}/g, '$1'),
  };
}

describe('JLPT lists (data/jlpt)', () => {
  it('equal a fresh build from sources/ (run npm run data:build)', () => {
    const fresh = buildJlptData(loadBuildSources());
    expect(fresh.problems).toEqual([]);
    expect(read('jlpt/vocabulary.json')).toBe(jsonLines(fresh.vocabulary));
    expect(read('jlpt/kanji.json')).toBe(jsonLines(fresh.kanji));
    expect(read('jlpt/grammar.json')).toBe(jsonLines(fresh.grammar));
    expect(read('kana.json')).toBe(jsonLines(fresh.kana));
    expect(JSON.parse(read('jlpt/ids.lock.json'))).toEqual(fresh.lock);
    expect(readFileSync(join(DATA, '..', '..', 'grader', 'src', 'lang', 'ja', 'data', 'words.json'), 'utf8')).toBe(jsonLines(graderWords(fresh.vocabulary)));
  });

  it('have the planned sizes', () => {
    expect([count(vocabulary, (w) => w.level === 'n5'), count(vocabulary, (w) => w.level === 'n4')]).toEqual([674, 630]);
    expect([count(kanji, (k) => k.level === 'n5'), count(kanji, (k) => k.level === 'n4')]).toEqual([80, 166]);
    expect([count(grammar, (g) => g.level === 'n5'), count(grammar, (g) => g.level === 'n4')]).toEqual([81, 98]);
    expect(kanji.find((k) => k.char === '分')?.level).toBe('n5');
  });

  it('numbers words 1..n without gaps and keeps ids unique', () => {
    expect(vocabulary.map((w) => w.no)).toEqual(vocabulary.map((_, i) => i + 1));
    expect(new Set(vocabulary.map((w) => w.openjlptId)).size).toBe(vocabulary.length);
    expect(new Set(kanji.map((k) => k.char)).size).toBe(kanji.length);
    expect(new Set(grammar.map((g) => g.id)).size).toBe(grammar.length);
  });

  it('gives every word furigana that spells its reading', () => {
    for (const w of vocabulary) {
      const { text, reading } = unruby(w.ruby);
      expect(text, `${w.no}`).toBe(w.word);
      expect(reading, `${w.no} ${w.word}`).toBe(w.reading);
      expect(w.forms[0]).toBe(w.word);
      expect(w.forms).toContain(w.reading);
    }
  });

  it('writes usually-kana words and words with kanji outside Jōyō in kana', () => {
    const byReading = (r: string) => vocabulary.filter((w) => w.reading === r);
    expect(byReading('わかる')[0]?.word).toBe('わかる');
    expect(byReading('わかる')[0]?.forms).toContain('分かる');
    expect(byReading('すごい')[0]?.word).toBe('すごい');
    expect(byReading('がくせい')[0]?.word).toBe('学生');
  });

  it('gives a Hán Việt reading to every word written with kanji', () => {
    for (const w of vocabulary) {
      const chars = kanjiOf(w.word).filter((c) => c !== String.fromCharCode(0x3005));
      if (chars.length === 0 || chars.every((c) => KOKUJI.includes(c))) expect(w.hanViet, w.word).toBeUndefined();
      else expect(w.hanViet?.split(' '), w.word).toHaveLength(chars.length);
    }
    expect(vocabulary.find((w) => w.word === '学生')?.hanViet).toBe('học sinh');
  });

  it('gives every kanji its readings and a main Hán Việt reading', () => {
    for (const k of kanji) {
      expect(k.on.length + k.kun.length, k.char).toBeGreaterThan(0);
      expect(k.strokes, k.char).toBeGreaterThan(0);
      expect(k.hanViet, k.char).toMatch(/^\p{L}+$/u);
    }
    expect(kanji.find((k) => k.char === '駅')).toMatchObject({ hanViet: 'dịch', on: ['エキ'] });
  });
});

describe('kana (data/kana.json)', () => {
  const of = (script: string, kind: string) => kana.filter((k) => k.script === script && k.kind === kind);

  it('has the standard sets', () => {
    for (const script of ['hiragana', 'katakana']) {
      expect(of(script, 'basic')).toHaveLength(46);
      expect(of(script, 'voiced')).toHaveLength(20);
      expect(of(script, 'semi-voiced')).toHaveLength(5);
      expect(of(script, 'combo')).toHaveLength(33);
    }
    expect(of('katakana', 'extended')).toHaveLength(19);
    expect(new Set(kana.map((k) => k.kana)).size).toBe(kana.length);
  });

  it('uses Hepburn romaji', () => {
    const romaji = (k: string) => kana.find((x) => x.kana === k)?.romaji;
    expect(['し', 'ち', 'つ', 'ふ', 'を', 'ん', 'ぢ', 'づ', 'じゃ', 'ティ', 'ファ'].map(romaji)).toEqual(['shi', 'chi', 'tsu', 'fu', 'wo', 'n', 'ji', 'zu', 'ja', 'ti', 'fa']);
  });

  it('has stroke counts for single kana (KanjiVG)', () => {
    for (const k of kana.filter((x) => [...x.kana].length === 1)) expect(k.strokes, k.kana).toBeGreaterThan(0);
    expect(kana.find((k) => k.kana === 'あ')?.strokes).toBe(3);
    expect(kana.find((k) => k.kana === 'ぬ')?.strokes).toBe(2);
  });
});
