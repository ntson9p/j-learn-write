import { loadKana, type Exercise, type KanaEntry } from '@j-learn-write/course';
import { describe, expect, it } from 'vitest';
import { acceptedForms, check, kanaDrills, needsJapaneseKeyboard, plainText, practiceDrills, shuffle, shuffledTiles } from '../src/lib/exercises';
import { romajiTable } from '../src/lib/romaji';

const choice: Exercise = { id: 't-c', type: 'choice', promptVi: '?', options: ['あ', 'お', 'め'], answer: 0 };
const fill: Exercise = { id: 't-f', type: 'fill', before: '', after: 'です。', answers: ['学生'] };
const order: Exercise = { id: 't-o', type: 'order', vi: 'Tôi là học sinh.', tiles: ['わたし', 'は', 'がくせい', 'です'], answers: ['わたしはがくせいです'] };
const match: Exercise = { id: 't-m', type: 'match', promptVi: '?', pairs: [['あ', 'a'], ['い', 'i'], ['う', 'u']] };

describe('checking answers', () => {
  it('normalizes before comparing', () => {
    expect(plainText(' わたし は、がくせい です。')).toBe('わたしはがくせいです');
    expect(plainText('ＡＢＣ')).toBe('abc');
  });

  it('checks choices, order and matching', () => {
    expect(check(choice, { type: 'choice', index: 0 })).toEqual({ correct: true, score: 100, expected: 'あ' });
    expect(check(choice, { type: 'choice', index: 2 }).correct).toBe(false);
    expect(check(order, { type: 'order', tiles: ['わたし', 'は', 'がくせい', 'です'] }).correct).toBe(true);
    expect(check(order, { type: 'order', tiles: ['がくせい', 'は', 'わたし', 'です'] })).toMatchObject({ correct: false, expected: 'わたしはがくせいです' });
    expect(check(match, { type: 'match', mistakes: 0 })).toEqual({ correct: true, score: 100 });
    expect(check(match, { type: 'match', mistakes: 1 })).toEqual({ correct: false, score: 75 });
  });

  it('accepts the kana reading of a fill answer when the lesson gives its furigana', () => {
    const ruby = { 学生: '{学|がく}{生|せい}' };
    expect(acceptedForms('学生', { ruby })).toEqual(['学生', 'がくせい']);
    expect(check(fill, { type: 'fill', text: 'がくせい' }, { ruby }).correct).toBe(true);
    expect(check(fill, { type: 'fill', text: '学生' }).correct).toBe(true);
    expect(check(fill, { type: 'fill', text: 'がくせい' }).correct).toBe(false);
    expect(check(fill, { type: 'fill', text: 'せんせい' }, { ruby })).toMatchObject({ correct: false, expected: '学生です。' });
  });

  it('asks for the Japanese keyboard instead of grading romaji', () => {
    expect(needsJapaneseKeyboard('gakusei', ['学生', 'がくせい'])).toBe(true);
    expect(needsJapaneseKeyboard('がくせい', ['学生'])).toBe(false);
    expect(needsJapaneseKeyboard('Ｔシャツ', ['Tシャツ'])).toBe(false);
  });

  it('does not grade free answers before the Japanese grader exists', () => {
    const translate: Exercise = { id: 't-t', type: 'translate', vi: 'Tôi là học sinh.', answers: ['わたしはがくせいです。'] };
    expect(() => check(translate, { type: 'text', text: 'わたしはがくせいです。' })).toThrow(/not graded yet/);
  });

  it('shuffles with a seed and never offers tiles already in order', () => {
    expect(shuffle([1, 2, 3, 4, 5], 'x')).toEqual(shuffle([1, 2, 3, 4, 5], 'x'));
    expect(shuffledTiles(order).join('')).not.toBe('わたしはがくせいです');
  });
});

describe('drills', async () => {
  const kana = await loadKana();
  const byChar = new Map(kana.map((k) => [k.kana, k]));
  const entries = (s: string) => [...s].map((c) => byChar.get(c)!);

  function expectValid(drills: { options: string[]; answer: number }[]) {
    for (const d of drills) {
      expect(new Set(d.options).size).toBe(d.options.length);
      expect(d.options.length).toBe(4);
      expect(d.answer).toBeGreaterThanOrEqual(0);
      expect(d.answer).toBeLessThan(4);
    }
  }

  it('asks about the kana of the lesson, with wrong options taught so far', () => {
    const taught = entries('あいうえおかきくけこ');
    const drills = kanaDrills('kana-01', taught, taught, { count: 6, listening: true });
    expect(drills).toHaveLength(6);
    expectValid(drills);
    expect(drills).toEqual(kanaDrills('kana-01', taught, taught, { count: 6, listening: true }));
    expect(drills.some((d) => d.listen)).toBe(true);
    expect(kanaDrills('kana-01', taught, taught, { count: 6, listening: false }).some((d) => d.listen)).toBe(false);
    const all = 'あいうえおかきくけこ';
    for (const d of drills) for (const o of d.options) expect(all.includes(o) || /^[a-z]+$/.test(o)).toBe(true);
  });

  it('never offers two kana with the same reading (じ/ぢ, ず/づ)', () => {
    const pool = kana.filter((k) => k.script === 'hiragana' && (k.kind === 'basic' || k.kind === 'voiced'));
    const taught = entries('じぢずづ');
    for (let seed = 0; seed < 20; seed++) {
      for (const d of kanaDrills(`kana-05-${seed}`, taught, pool, { count: 4, listening: false })) {
        const romaji = d.options.map((o) => byChar.get(o)?.romaji ?? o);
        expect(new Set(romaji).size).toBe(romaji.length);
      }
    }
  });

  it('skips marks that are not read alone (っ, small ゃ)', () => {
    const taught = [...entries('っゃゅょ'), ...entries('かきくけこ')];
    const drills = kanaDrills('kana-06', taught, entries('あいうえおかきくけこ'), { count: 9, listening: false });
    for (const d of drills) expect(d.promptVi).not.toMatch(/[っゃゅょ]/);
  });

  it('asks about the practice words: meaning, romaji, sound', () => {
    const practice = [
      { ja: 'あき', vi: 'mùa thu' },
      { ja: 'いえ', vi: 'ngôi nhà' },
      { ja: 'かお', vi: 'khuôn mặt' },
      { ja: 'えき', vi: 'nhà ga' },
      { ja: 'こえ', vi: 'giọng nói' },
    ];
    const drills = practiceDrills('kana-01', practice, romajiTable(kana as KanaEntry[]), { count: 3, listening: true });
    expect(drills).toHaveLength(3);
    expectValid(drills);
    expect(drills.map((d) => d.promptVi.replace(/「.*」/, '「…」'))).toEqual(['「…」nghĩa là gì?', '「…」đọc là gì?', 'Nghe và chọn từ đúng.']);
    expect(practiceDrills('kana-01', practice.slice(0, 3), romajiTable(kana), { count: 3, listening: true })).toEqual([]);
  });
});
