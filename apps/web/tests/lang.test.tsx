import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../src/app';
import { navigate, syncFromLocation } from '../src/router';
import { ROUTES } from '../src/routes';

const JAPANESE = /[぀-ヿ㐀-鿿豈-﫿]/;

/** Text nodes with kana or kanji that no ancestor marks as lang="ja". */
export function untaggedJapanese(root: Node): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    if (!JAPANESE.test(text)) continue;
    const lang = (node.parentElement?.closest('[lang]') as HTMLElement | null)?.lang;
    if (lang !== 'ja') found.push(text.trim());
  }
  return found;
}

describe('lang="ja"', () => {
  it('finds Japanese text outside lang="ja"', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p lang="vi">Chữ <span lang="ja">学生</span> và 先生</p>';
    expect(untaggedJapanese(div)).toEqual(['và 先生']);
  });

  for (const route of ROUTES.filter((r) => !r.pattern.includes(':'))) {
    it(`marks every Japanese text on ${route.pattern}`, async () => {
      navigate(route.pattern);
      syncFromLocation();
      const { container } = render(<App />);
      await screen.findByRole('heading', { level: 1 });
      expect(untaggedJapanese(container)).toEqual([]);
    });
  }
});
