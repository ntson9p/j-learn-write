import { CURRICULUM } from '@j-learn-write/course';
import { describe, expect, it } from 'vitest';
import { findGrammar, findKanji, findLesson, findWord, levelOfLesson } from '../src/lib/content';
import { kanjiOfCompleted } from '../src/lib/learned';
import { posLabels } from '../src/lib/pos';
import { kunLabel } from '../src/pages/kanji-detail';

describe('course content for the screens', () => {
  it('finds lessons, words, kanji and grammar points with the lesson that teaches them', async () => {
    expect(levelOfLesson('n5-01')).toBe('n5');
    expect(levelOfLesson('x5-01')).toBeUndefined();
    expect((await findLesson('n5-01'))?.content?.id).toBe('n5-01');
    const watashi = await findWord(1305);
    expect(watashi?.word.word).toBe('私');
    expect(watashi?.lesson?.meta.id).toBe('n5-01');
    expect(watashi?.content?.meaningsVi[0]).toBe('tôi');
    expect(await findWord(999999)).toBeUndefined();
    const hi = await findKanji('日');
    expect(hi?.lesson?.meta.id).toBe('n5-01');
    const levels = hi!.words.map((w) => w.word.level);
    expect(levels.lastIndexOf('n5')).toBeLessThan(levels.indexOf('n4')); // N5 words first
    expect(hi?.words.find((w) => w.word.word === '日本')?.content?.meaningsVi).toEqual(['Nhật Bản']);
    expect((await findGrammar('wa'))?.content?.titleVi).toContain('は');
    expect(await findGrammar('nope')).toBeUndefined();
  });

  it('counts as learned the kanji of completed lessons only', () => {
    const progress = new Map([
      ['n5-01', { lessonId: 'n5-01', startedAt: 1, completedAt: 2, bestScore: 90, exercises: {} }],
      ['n5-02', { lessonId: 'n5-02', startedAt: 1, completedAt: null, bestScore: 50, exercises: {} }],
    ]);
    expect([...kanjiOfCompleted(CURRICULUM, progress)].sort()).toEqual(['人', '日', '本']);
  });

  it('labels parts of speech and kun readings in Vietnamese', () => {
    expect(posLabels(['v5k', 'vt', 'v5r'])).toEqual(['động từ nhóm 1', 'tha động từ']);
    expect(posLabels(['n', 'vs', 'xyz'])).toEqual(['danh từ', 'đi với する']);
    expect(kunLabel('た.べる')).toBe('た(べる)');
    expect(kunLabel('ひと')).toBe('ひと');
  });
});
