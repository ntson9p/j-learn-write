import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app';
import { navigate, syncFromLocation } from '../src/router';
import { ROUTES } from '../src/routes';
import { untaggedJapanese } from './untagged';

describe('lang="ja"', () => {
  it('finds Japanese text outside lang="ja"', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p lang="vi">Chữ <span lang="ja">学生</span> và 先生</p>';
    expect(untaggedJapanese(div)).toEqual(['và 先生']);
  });

  /** Every route without parameters, and samples of the others. */
  const paths = [...ROUTES.filter((r) => !r.pattern.includes(':')).map((r) => r.pattern), '/lesson/kana-01', '/practice/kana-01', '/quiz/kana-01', '/kana/あ', '/write/あ'];
  for (const path of paths) {
    it(`marks every Japanese text on ${path}`, async () => {
      navigate(path);
      syncFromLocation();
      const { container } = render(<App />);
      await screen.findByRole('heading', { level: 1 });
      expect(untaggedJapanese(container)).toEqual([]);
    });
  }
});
