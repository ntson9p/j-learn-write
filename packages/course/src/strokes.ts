/**
 * Stroke data for writing practice, in the format of hanzi-writer (Make Me a
 * Hanzi): `strokes` are outline paths, `medians` the centre line of each
 * stroke (used to animate and to check the learner's strokes), in a 1024 box
 * whose y axis goes up (screen y = 900 - y).
 *
 * - Kanji: AnimCJK data as is.
 * - Kana: AnimCJK splits a stroke that crosses itself (あ, ぬ, の…) into
 *   parts whose centre lines only serve its animation. The parts of one
 *   stroke are joined into one outline; the centre line of such a joined
 *   stroke comes from KanjiVG (one path per stroke, in stroke order), scaled
 *   to the same box. Strokes that were not split keep AnimCJK's own centre
 *   line, which fits its outline (KanjiVG places dakuten marks elsewhere).
 */

export interface CharStrokes {
  strokes: string[];
  medians: number[][][];
}

type Point = [number, number];

/** KanjiVG draws in a 109 × 109 box with y down. */
const KVG_SIZE = 109;
const BOX = 1024;
const BASELINE = 900;

/** Parts of a stroke split by AnimCJK whose centre line stays inside the box, joined by hand: char → groups of part indexes. */
export const MANUAL_GROUPS: Readonly<Record<string, number[][]>> = {
  す: [[0], [1, 2]],
  ず: [[0], [1, 2], [3], [4]],
  ね: [[0], [1, 2]],
  の: [[0, 1]],
};

/** Points along an SVG path (M, L, H, V, C, S, Z, absolute or relative), cubic curves sampled `steps` times. */
export function samplePath(d: string, steps = 6): Point[] {
  const tokens = d.match(/[MmLlHhVvCcSsZz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const out: Point[] = [];
  let i = 0;
  let cmd = '';
  let cur: Point = [0, 0];
  let start: Point = [0, 0];
  let lastCtrl: Point | null = null;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i]!)) cmd = tokens[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const at = (x: number, y: number): Point => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
    switch (cmd.toUpperCase()) {
      case 'M':
        cur = at(num(), num());
        start = cur;
        out.push(cur);
        cmd = rel ? 'l' : 'L';
        lastCtrl = null;
        break;
      case 'L':
        cur = at(num(), num());
        out.push(cur);
        lastCtrl = null;
        break;
      case 'H':
        cur = [rel ? cur[0] + num() : num(), cur[1]];
        out.push(cur);
        lastCtrl = null;
        break;
      case 'V':
        cur = [cur[0], rel ? cur[1] + num() : num()];
        out.push(cur);
        lastCtrl = null;
        break;
      case 'C':
      case 'S': {
        const c1: Point =
          cmd.toUpperCase() === 'C' ? at(num(), num()) : lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur;
        const c2 = at(num(), num());
        const end = at(num(), num());
        const p0 = cur;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const u = 1 - t;
          out.push([
            u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
            u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
          ]);
        }
        lastCtrl = c2;
        cur = end;
        break;
      }
      case 'Z':
        cur = start;
        out.push(cur);
        lastCtrl = null;
        break;
      default:
        throw new Error(`unsupported path command ${cmd} in ${d}`);
    }
  }
  return out;
}

/** KanjiVG point → hanzi-writer point (1024 box, y up, baseline at 900). */
export function kvgToWriter([x, y]: Point): Point {
  return [Math.round((x * BOX) / KVG_SIZE), Math.round(BASELINE - (y * BOX) / KVG_SIZE)];
}

/** True when a centre-line point lies outside the drawing box (AnimCJK's animation-only tails). */
const offBox = ([x, y]: number[]) => x! < 0 || x! > BOX || y! < BASELINE - BOX || y! > BASELINE;

/** Groups of AnimCJK parts that form one stroke: a part whose centre line leaves the box continues the previous one. */
export function partGroups(char: string, medians: readonly (readonly number[][])[]): number[][] {
  const manual = MANUAL_GROUPS[char];
  if (manual) return manual;
  const groups: number[][] = [];
  medians.forEach((m, i) => {
    if (i > 0 && m.some(offBox)) groups.at(-1)!.push(i);
    else groups.push([i]);
  });
  return groups;
}

/** Writing-practice data of a kana: AnimCJK outlines joined per stroke; KanjiVG centre lines for joined strokes. */
export function kanaStrokes(char: string, anim: CharStrokes, kvgPaths: readonly string[]): CharStrokes {
  const groups = partGroups(char, anim.medians);
  if (groups.length !== kvgPaths.length) {
    throw new Error(`${char}: ${groups.length} strokes from AnimCJK, ${kvgPaths.length} in KanjiVG`);
  }
  return {
    strokes: groups.map((g) => g.map((i) => anim.strokes[i]!).join(' ')),
    medians: groups.map((g, i) => (g.length === 1 ? anim.medians[g[0]!]!.map((p) => [p[0]!, p[1]!]) : thin(samplePath(kvgPaths[i]!).map(kvgToWriter)))),
  };
}

/** Drops points closer than 12 units to the previous one (hanzi-writer needs few points). */
function thin(points: Point[]): number[][] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 12) out.push(p);
  }
  const end = points.at(-1);
  if (end && out.at(-1) !== end) out.push(end);
  return out.map((p) => [p[0], p[1]]);
}
