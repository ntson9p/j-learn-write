import { describe, expect, it } from 'vitest';
import { segments } from '../src/highlight';
import type { Issue } from '../src';

const issue = (fields: Partial<Issue>): Issue => ({
  code: 'x',
  severity: 'error',
  penalty: 10,
  message: 'm',
  start: 0,
  end: 0,
  ...fields,
});

describe('segments', () => {
  it('returns the plain text when there is nothing to mark', () => {
    expect(segments('三つです', [])).toEqual([{ kind: 'text', text: '三つです' }]);
    expect(segments('', [])).toEqual([]);
  });

  it('marks spans and insertion points', () => {
    const result = segments('鉛筆三枚', [
      issue({ start: 3, end: 4, message: 'wrong' }),
      issue({ start: 2, end: 2, message: 'missing', fix: { start: 2, end: 2, replacement: 'が' } }),
    ]);
    expect(result).toEqual([
      { kind: 'text', text: '鉛筆' },
      { kind: 'insert', messages: ['missing'] },
      { kind: 'text', text: '三' },
      { kind: 'mark', text: '枚', severity: 'error', messages: ['wrong'] },
    ]);
  });

  it('merges overlapping issues and skips info notes', () => {
    const result = segments('本の私', [
      issue({ start: 0, end: 3, message: 'order' }),
      issue({ start: 0, end: 1, severity: 'typo', message: 'typo' }),
      issue({ start: 0, end: 0, severity: 'info', message: 'info' }),
    ]);
    expect(result).toEqual([
      { kind: 'mark', text: '本', severity: 'error', messages: ['order', 'typo'] },
      { kind: 'mark', text: 'の私', severity: 'error', messages: ['order'] },
    ]);
  });
});
