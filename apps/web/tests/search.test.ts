import type { ListWord, WordContent } from '@j-learn-write/course';
import { describe, expect, it } from 'vitest';
import { foldKana, foldVi, romajiQuery, searchWords, type DictEntry } from '../src/lib/search';

const word = (no: number, w: string, reading: string, hanViet?: string): ListWord => ({
  no,
  level: 'n5',
  openjlptId: String(no),
  word: w,
  reading,
  ruby: w,
  forms: [w, reading],
  pos: ['n'],
  ...(hanViet ? { hanViet } : {}),
});
const content = (no: number, w: string, meanings: string[]): WordContent => ({ no, word: w, meaningsVi: meanings, examples: [], review: { status: 'draft' } });

const entries: DictEntry[] = [
  { word: word(1, '学生', 'がくせい', 'học sinh'), content: content(1, '学生', ['học sinh', 'sinh viên']) },
  { word: word(2, '先生', 'せんせい', 'tiên sinh'), content: content(2, '先生', ['giáo viên']) },
  { word: word(3, 'コーヒー', 'コーヒー'), content: content(3, 'コーヒー', ['cà phê']) },
  { word: word(4, '大学生', 'だいがくせい', 'đại học sinh'), content: null },
];
const nos = (q: string) => searchWords(entries, q).map((e) => e.word.no);

describe('dictionary search', () => {
  it('folds Vietnamese diacritics and katakana long vowels', () => {
    expect(foldVi('Học Sinh ')).toBe('hoc sinh');
    expect(foldVi('Đại học')).toBe('dai hoc');
    expect(foldKana('コーヒー')).toBe('こおひい');
    expect(romajiQuery('gakusei')).toBe('がくせい');
    expect(romajiQuery('hoc sinh')).toBeNull();
  });

  it('finds words by kanji, kana, romaji, meaning and Hán Việt, exact matches first', () => {
    expect(nos('学生')).toEqual([1, 4]);
    expect(nos('がくせい')).toEqual([1, 4]);
    expect(nos('gakusei')).toEqual([1, 4]);
    expect(nos('koohii')).toEqual([3]);
    expect(nos('こーひー')).toEqual([3]);
    expect(nos('giao vien')).toEqual([2]);
    expect(nos('sinh')).toEqual([1, 2, 4]);
    expect(nos('dai hoc')).toEqual([4]);
    expect(nos('')).toEqual([1, 2, 3, 4]);
    expect(nos('xyz')).toEqual([]);
  });
});
