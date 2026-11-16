import { loadKana, loadLevel, loadVocabulary } from '@j-learn-write/course';
import { describe, expect, it } from 'vitest';
import { wordDrills } from '../src/lib/exercises';
import { LEVEL_TEST_SIZE, levelTestItems } from '../src/pages/level-test';

describe('level tests and word drills', async () => {
  const kana = await loadKana();
  const listed = new Map((await loadVocabulary()).map((w) => [w.no, w]));
  const written = async (level: 'kana' | 'n5') =>
    (await loadLevel(level)).filter((l) => l.content).map((l) => ({ id: l.meta.id, exercises: l.content!.exercises, words: l.content!.words ?? [], kana: l.meta.kana ?? [] }));

  it('asks about meanings, words, readings and sounds, with distinct options', async () => {
    const words = (await loadLevel('n5'))[0]!.content!.words!;
    const drills = wordDrills('n5-01', words, listed, { count: 8, listening: true });
    expect(drills.length).toBe(8);
    for (const d of drills) {
      expect(new Set(d.options).size).toBe(4);
      expect(d.answer).toBeGreaterThanOrEqual(0);
    }
    expect(new Set(drills.map((d) => d.promptVi.replace(/「.*」|".*"/, '…'))).size).toBeGreaterThanOrEqual(3);
    expect(drills).toEqual(wordDrills('n5-01', words, listed, { count: 8, listening: true }));
  });

  it('builds a fixed-size test per level and attempt, without matching', async () => {
    for (const level of ['kana', 'n5'] as const) {
      const items = levelTestItems(level, await written(level), kana, listed, 0, false);
      expect(items).toHaveLength(LEVEL_TEST_SIZE);
      expect(items.some((e) => e.type === 'match')).toBe(false);
      expect(items).toEqual(levelTestItems(level, await written(level), kana, listed, 0, false));
      expect(items).not.toEqual(levelTestItems(level, await written(level), kana, listed, 1, false));
    }
  });
});
