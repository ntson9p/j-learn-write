import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

describe('package boundaries', () => {
  it('the app uses only the public API of the grader', () => {
    const src = join(__dirname, '..', 'src');
    const offenders = files(src).filter((f) => {
      const text = readFileSync(f, 'utf8');
      return /from '@j-learn-write\/grader\/(?!questions')/.test(text) || /from '(\.\.\/)+(packages|grader)/.test(text);
    });
    expect(offenders).toEqual([]);
  });
});
