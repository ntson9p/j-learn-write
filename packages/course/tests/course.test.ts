import { describe, expect, it } from 'vitest';
import { CURRICULUM, curriculumOf, kanjiId, LEVEL_STATUS, LEVELS, wordId } from '../src/course';

describe('course data', () => {
  it('lists the levels in learning order with a status', () => {
    expect(LEVELS).toEqual(['kana', 'n5', 'n4']);
    for (const level of LEVELS) expect(['complete', 'in_progress', 'planned']).toContain(LEVEL_STATUS[level]);
  });

  it('sorts lessons by order within a level', () => {
    for (const level of LEVELS) {
      const orders = curriculumOf(level).map((l) => l.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
    expect(new Set(CURRICULUM.map((l) => l.id)).size).toBe(CURRICULUM.length);
  });

  it('builds storage ids', () => {
    expect(wordId(7)).toBe('w0007');
    expect(kanjiId('学')).toBe('k学');
  });
});
