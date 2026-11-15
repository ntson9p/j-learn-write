import type { Fix } from './types';

export interface FixResult {
  text: string;
  /** Fixes that were applied, in text order. */
  applied: Fix[];
  /** Fixes skipped because they overlapped an earlier fix. */
  skipped: Fix[];
  /**
   * For every index of the new text (plus one past the end), the index of
   * the original text it comes from. Inserted characters map to the
   * insertion point.
   */
  toOriginal: number[];
}

/**
 * Applies non-overlapping fixes to a text. Fixes are processed in order of
 * position; at the same position insertions come first, then the longest
 * replacement (a broad fix such as a word-order fix already contains the
 * corrected inner text). A fix that overlaps an applied one is skipped.
 */
export function applyFixes(text: string, fixes: readonly Fix[]): FixResult {
  const isInsert = (fix: Fix) => (fix.start === fix.end ? 0 : 1);
  const sorted = fixes
    .map((fix, order) => ({ fix, order }))
    .sort(
      (x, y) =>
        x.fix.start - y.fix.start ||
        isInsert(x.fix) - isInsert(y.fix) ||
        y.fix.end - x.fix.end ||
        x.order - y.order,
    )
    .map(({ fix }) => fix);

  const applied: Fix[] = [];
  const skipped: Fix[] = [];
  let out = '';
  const toOriginal: number[] = [];
  let cursor = 0;

  for (const fix of sorted) {
    if (fix.start < cursor || fix.end < fix.start || fix.end > text.length) {
      skipped.push(fix);
      continue;
    }
    for (let k = cursor; k < fix.start; k++) {
      out += text[k];
      toOriginal.push(k);
    }
    for (let k = 0; k < fix.replacement.length; k++) {
      out += fix.replacement[k];
      toOriginal.push(fix.start);
    }
    cursor = fix.end;
    applied.push(fix);
  }
  for (let k = cursor; k < text.length; k++) {
    out += text[k];
    toOriginal.push(k);
  }
  toOriginal.push(text.length);
  return { text: out, applied, skipped, toOriginal };
}
