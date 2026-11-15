import { T } from '../strings';

/** Vietnamese labels of JMdict part-of-speech codes (v5k, v5r… are all group 1 verbs), without repeats. */
export function posLabels(pos: readonly string[]): string[] {
  const out: string[] = [];
  for (const p of pos) {
    const label = T.pos[p.startsWith('v5') ? 'v5' : p];
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}
