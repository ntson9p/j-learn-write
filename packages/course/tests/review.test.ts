import { describe, expect, it } from 'vitest';
import { contentHash } from '../src/hash';
import { effectiveStatus } from '../src/review';
import type { Review } from '../src/types';

describe('effectiveStatus', () => {
  const word: { no: number; word: string; meaningsVi: string[]; review?: Review } = { no: 1, word: '学生', meaningsVi: ['học sinh'] };

  it('is draft without a review', () => {
    expect(effectiveStatus(word)).toBe('draft');
  });

  it('keeps an approval while the content is unchanged', () => {
    const approved = { ...word, review: { status: 'approved' as const, hash: contentHash(word) } };
    expect(effectiveStatus(approved)).toBe('approved');
    const edited = { ...approved, meaningsVi: ['sinh viên'] };
    expect(effectiveStatus(edited)).toBe('draft');
  });

  it('keeps a change request', () => {
    expect(effectiveStatus({ ...word, review: { status: 'changes_requested' as const } })).toBe('changes_requested');
  });
});

describe('contentHash', () => {
  it('ignores key order and the review record', () => {
    expect(contentHash({ a: 1, b: [1, 2] })).toBe(contentHash({ b: [1, 2], a: 1, review: { status: 'draft' } }));
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });
});
