import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { kanaStrokes, kvgToWriter, partGroups, samplePath, type CharStrokes } from '../src/strokes';
import type { ListKanji } from '../src/types';

const SRC = join(__dirname, '..', 'sources');
const readAnim = (file: string) =>
  new Map(
    readFileSync(join(SRC, 'animcjk', file), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const o = JSON.parse(l) as CharStrokes & { character: string };
        return [o.character, o] as const;
      }),
  );
const kanaAnim = readAnim('graphicsJaKana.txt');
const kanjiAnim = readAnim('graphicsJa.txt');
const kvgPaths = JSON.parse(readFileSync(join(SRC, 'kanjivg', 'kana-paths.json'), 'utf8')) as Record<string, string[]>;
const kvgCounts = JSON.parse(readFileSync(join(SRC, 'kanjivg', 'stroke-counts.json'), 'utf8')) as Record<string, number>;
const kanji = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'jlpt', 'kanji.json'), 'utf8')) as ListKanji[];

/** Bounding box of an outline path (all its coordinate pairs). */
function bbox(path: string): [number, number, number, number] {
  const nums = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

describe('SVG path sampling', () => {
  it('samples lines and cubic curves, relative and absolute', () => {
    expect(samplePath('M0,0 L10,0 l0,10')).toEqual([[0, 0], [10, 0], [10, 10]]);
    const curve = samplePath('M0,0c0,10,10,10,10,0', 2);
    expect(curve).toEqual([[0, 0], [5, 7.5], [10, 0]]);
    expect(samplePath('M0,0C0,10,10,10,10,0s10,-10,10,0', 1).at(-1)).toEqual([20, 0]);
    expect(kvgToWriter([0, 0])).toEqual([0, 900]);
    expect(kvgToWriter([109, 109])).toEqual([1024, -124]);
  });
});

describe('kana stroke data (AnimCJK outlines + KanjiVG centre lines)', () => {
  it('joins split parts so that every kana has the KanjiVG number of strokes', () => {
    expect(kanaAnim.size).toBe(177);
    for (const [ch, anim] of kanaAnim) {
      const data = kanaStrokes(ch, anim, kvgPaths[ch]!);
      expect(data.strokes.length, ch).toBe(kvgCounts[ch]);
      expect(data.medians.length, ch).toBe(kvgCounts[ch]);
    }
    expect(partGroups('あ', kanaAnim.get('あ')!.medians)).toEqual([[0], [1], [2, 3]]);
    expect(partGroups('ぬ', kanaAnim.get('ぬ')!.medians)).toEqual([[0], [1, 2, 3]]);
  });

  it('puts each centre line inside the outline of the same stroke', () => {
    const MARGIN = 70;
    const misplaced: string[] = [];
    for (const [ch, anim] of kanaAnim) {
      const data = kanaStrokes(ch, anim, kvgPaths[ch]!);
      data.medians.forEach((median, i) => {
        const [x0, y0, x1, y1] = bbox(data.strokes[i]!);
        const inside = median.filter(([x, y]) => x! >= x0 - MARGIN && x! <= x1 + MARGIN && y! >= y0 - MARGIN && y! <= y1 + MARGIN).length;
        if (inside / median.length < 0.9) misplaced.push(`${ch} stroke ${i + 1}: ${inside}/${median.length}`);
      });
    }
    expect(misplaced).toEqual([]);
  });
});

describe('kanji stroke data (AnimCJK)', () => {
  it('has every kanji to learn with the KanjiVG number of strokes', () => {
    const wrong = kanji.filter((k) => kanjiAnim.get(k.char)?.strokes.length !== kvgCounts[k.char]).map((k) => `${k.char} ${kanjiAnim.get(k.char)?.strokes.length} ${kvgCounts[k.char]}`);
    expect(wrong).toEqual([]);
    expect(kanji.filter((k) => kanjiAnim.get(k.char)?.strokes.length !== k.strokes).map((k) => k.char)).toEqual([]);
  });
});
