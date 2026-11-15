import { describe, expect, it } from 'vitest';
import { applyFixes } from '../../src/core/fixes';

describe('applyFixes', () => {
  it('replaces and inserts text', () => {
    // 三ほん -> 三ぼん ; 三りんご -> 三つりんご
    expect(applyFixes('三ほん', [{ start: 1, end: 2, replacement: 'ぼ' }]).text).toBe('三ぼん');
    expect(applyFixes('三りんご', [{ start: 1, end: 1, replacement: 'つ' }]).text).toBe('三つりんご');
  });

  it('applies several fixes in position order', () => {
    const result = applyFixes('猫二ます', [
      { start: 2, end: 2, replacement: 'い' },
      { start: 1, end: 2, replacement: 'が' },
    ]);
    expect(result.text).toBe('猫がいます');
    expect(result.applied).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);
  });

  it('inserts before replacing at the same position', () => {
    // 橋で食べる: missing honorific お (insert at 0) + homophone typo 橋 -> 箸 (at 0)
    const result = applyFixes('橋で食べる', [
      { start: 0, end: 1, replacement: '箸' },
      { start: 0, end: 0, replacement: 'お' },
    ]);
    expect(result.text).toBe('お箸で食べる');
    expect(result.skipped).toHaveLength(0);
  });

  it('skips fixes inside a broader fix', () => {
    const result = applyFixes('本の私', [
      { start: 0, end: 3, replacement: '私の本' },
      { start: 0, end: 1, replacement: 'ほ' },
    ]);
    expect(result.text).toBe('私の本');
    expect(result.skipped).toEqual([{ start: 0, end: 1, replacement: 'ほ' }]);
  });

  it('maps new positions back to the original text', () => {
    const result = applyFixes('三りん', [{ start: 1, end: 1, replacement: 'つ' }]);
    // 三(0) つ(inserted at 1) り(1) ん(2) end(3)
    expect(result.toOriginal).toEqual([0, 1, 1, 2, 3]);
  });

  it('leaves the text unchanged without fixes', () => {
    expect(applyFixes('はい', [])).toMatchObject({ text: 'はい', toOriginal: [0, 1, 2] });
  });
});
