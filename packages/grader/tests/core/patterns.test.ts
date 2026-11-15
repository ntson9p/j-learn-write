import { describe, expect, it } from 'vitest';
import { expandPattern, PatternError } from '../../src/core/patterns';

describe('expandPattern', () => {
  it('returns plain text unchanged', () => {
    expect(expandPattern('私はベトナム人です。')).toEqual(['私はベトナム人です。']);
  });

  it('expands optional parts, full form first', () => {
    expect(expandPattern('(私は)ベトナム人です')).toEqual(['私はベトナム人です', 'ベトナム人です']);
  });

  it('expands alternatives', () => {
    expect(expandPattern('[これ|それ]はりんごです')).toEqual(['これはりんごです', 'それはりんごです']);
  });

  it('expands nested groups', () => {
    expect(expandPattern('[これ(だけ)|この本]は高い')).toEqual(['これだけは高い', 'これは高い', 'この本は高い']);
  });

  it('combines several groups', () => {
    expect(expandPattern('(今)(は)二時(です)')).toEqual([
      '今は二時です',
      '今は二時',
      '今二時です',
      '今二時',
      'は二時です',
      'は二時',
      '二時です',
      '二時',
    ]);
  });

  it('removes duplicates and empty results', () => {
    expect(expandPattern('[りんご|りんご](。)')).toEqual(['りんご。', 'りんご']);
    expect(expandPattern('(私)')).toEqual(['私']);
  });

  it('rejects malformed patterns', () => {
    expect(() => expandPattern('[これ|それはりんご')).toThrow(PatternError);
    expect(() => expandPattern('(これはりんご')).toThrow(PatternError);
    expect(() => expandPattern('これは)りんご')).toThrow(PatternError);
    expect(() => expandPattern('(これ|それ)はりんご')).toThrow(/Use \[a\|b\]/);
    expect(() => expandPattern('')).toThrow(PatternError);
    expect(() => expandPattern('()')).toThrow(PatternError);
  });

  it('refuses patterns that expand too much', () => {
    const pattern = '(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)';
    expect(expandPattern(pattern, 2000)).toHaveLength(1023);
    expect(() => expandPattern(pattern, 500)).toThrow(/more than 500/);
  });
});
