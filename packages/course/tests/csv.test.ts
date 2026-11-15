import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvObjects, toCsv } from '../src/csv';

describe('csv', () => {
  it('reads quotes, doubled quotes, CRLF and multi-line fields', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n"1\n2",3')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['1\n2', '3'],
    ]);
  });
  it('skips a BOM and blank rows in objects', () => {
    expect(parseCsvObjects(`${String.fromCharCode(0xfeff)}Mã,Từ\n1,学生\n\n`)).toEqual([{ Mã: '1', Từ: '学生' }]);
  });
  it('writes what it reads', () => {
    const rows = [['a', 'b,c'], ['"q"', ' lead'], ['x\ny', '']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
    expect(toCsv([['a']], true).startsWith(String.fromCharCode(0xfeff))).toBe(true);
  });
});
