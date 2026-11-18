import { describe, expect, it } from 'vitest';
import { align, type AlignCosts } from '../../src/core/align';

const unit: AlignCosts<string, string> = {
  equal: (a, b) => a === b,
  substitute: () => 1,
  extra: () => 1,
  missing: () => 1,
};

const SYMBOL = { match: '=', substitute: '~', extra: '+', missing: '-' } as const;
const kinds = (a: string, b: string) =>
  align([...a], [...b], unit)
    .ops.map((op) => SYMBOL[op.kind])
    .join('');

describe('align', () => {
  it('computes the edit distance', () => {
    expect(align([...'kitten'], [...'sitting'], unit).cost).toBe(3);
    expect(align([], [], unit).cost).toBe(0);
    expect(align([...'abc'], [], unit).cost).toBe(3);
    expect(align([], [...'abc'], unit).cost).toBe(3);
  });

  it('returns the operations in order', () => {
    expect(kinds('abc', 'abc')).toBe('===');
    expect(kinds('abc', 'axc')).toBe('=~=');
    expect(kinds('ac', 'abc')).toBe('=-=');
    expect(kinds('abxc', 'abc')).toBe('==+=');
  });

  it('reports missing and extra units with their indexes', () => {
    const missing = align([...'私ベトナム人'], [...'私はベトナム人'], unit);
    expect(missing.cost).toBe(1);
    expect(missing.ops.filter((op) => op.kind === 'missing')).toEqual([{ kind: 'missing', b: 'は', bi: 1, cost: 1 }]);

    const extra = align([...'私ははベトナム人'], [...'私はベトナム人'], unit);
    expect(extra.cost).toBe(1);
    expect(extra.ops.filter((op) => op.kind === 'extra')).toHaveLength(1);
  });

  it('uses weighted costs', () => {
    const cheapSub: AlignCosts<string, string> = { ...unit, substitute: () => 0.3 };
    const result = align([...'箸を'], [...'橋を'], cheapSub);
    expect(result.cost).toBeCloseTo(0.3);
    expect(result.ops[0]).toMatchObject({ kind: 'substitute', a: '箸', b: '橋' });
  });
});
