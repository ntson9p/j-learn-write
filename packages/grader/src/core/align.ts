/**
 * Weighted edit-distance alignment between a learner answer (a) and a model
 * answer (b), returning the cheapest sequence of edit operations.
 */

export type AlignOp<A, B> =
  | { kind: 'match'; a: A; b: B; ai: number; bi: number }
  | { kind: 'substitute'; a: A; b: B; ai: number; bi: number; cost: number }
  /** A unit of the answer that the model does not have. */
  | { kind: 'extra'; a: A; ai: number; cost: number }
  /** A unit of the model that the answer does not have. */
  | { kind: 'missing'; b: B; bi: number; cost: number };

export interface AlignCosts<A, B> {
  equal(a: A, b: B): boolean;
  substitute(a: A, b: B): number;
  extra(a: A): number;
  missing(b: B): number;
}

export interface Alignment<A, B> {
  cost: number;
  ops: AlignOp<A, B>[];
}

const EPS = 1e-9;

export function align<A, B>(a: readonly A[], b: readonly B[], costs: AlignCosts<A, B>): Alignment<A, B> {
  const n = a.length;
  const m = b.length;
  const width = m + 1;
  const dp = new Float64Array((n + 1) * width);
  const at = (i: number, j: number) => dp[i * width + j]!;

  for (let i = 1; i <= n; i++) dp[i * width] = at(i - 1, 0) + costs.extra(a[i - 1]!);
  for (let j = 1; j <= m; j++) dp[j] = at(0, j - 1) + costs.missing(b[j - 1]!);

  for (let i = 1; i <= n; i++) {
    const ai = a[i - 1]!;
    for (let j = 1; j <= m; j++) {
      const bj = b[j - 1]!;
      const diag = at(i - 1, j - 1) + (costs.equal(ai, bj) ? 0 : costs.substitute(ai, bj));
      const up = at(i - 1, j) + costs.extra(ai);
      const left = at(i, j - 1) + costs.missing(bj);
      dp[i * width + j] = Math.min(diag, up, left);
    }
  }

  // Backtrace; on ties prefer diagonal moves, then "missing", then "extra",
  // so the result is deterministic.
  const ops: AlignOp<A, B>[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const here = at(i, j);
    if (i > 0 && j > 0) {
      const ai = a[i - 1]!;
      const bj = b[j - 1]!;
      const isEqual = costs.equal(ai, bj);
      const subCost = isEqual ? 0 : costs.substitute(ai, bj);
      if (Math.abs(at(i - 1, j - 1) + subCost - here) < EPS) {
        ops.push(
          isEqual
            ? { kind: 'match', a: ai, b: bj, ai: i - 1, bi: j - 1 }
            : { kind: 'substitute', a: ai, b: bj, ai: i - 1, bi: j - 1, cost: subCost },
        );
        i--;
        j--;
        continue;
      }
    }
    if (j > 0) {
      const bj = b[j - 1]!;
      const missCost = costs.missing(bj);
      if (Math.abs(at(i, j - 1) + missCost - here) < EPS) {
        ops.push({ kind: 'missing', b: bj, bi: j - 1, cost: missCost });
        j--;
        continue;
      }
    }
    const ai = a[i - 1]!;
    ops.push({ kind: 'extra', a: ai, ai: i - 1, cost: costs.extra(ai) });
    i--;
  }
  ops.reverse();
  return { cost: at(n, m), ops };
}
