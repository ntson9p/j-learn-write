import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { MixedText, splitJapanese } from '../src/components/text';

describe('MixedText', () => {
  it('splits Japanese runs from Vietnamese text', () => {
    expect(splitJapanese('gõ "watashi" thành わたし, chọn 私。')).toEqual([
      { text: 'gõ "watashi" thành ', ja: false },
      { text: 'わたし', ja: true },
      { text: ', chọn ', ja: false },
      { text: '私。', ja: true },
    ]);
    expect(splitJapanese('Không có chữ Nhật')).toEqual([{ text: 'Không có chữ Nhật', ja: false }]);
  });

  it('marks Japanese runs with lang="ja"', () => {
    const { container } = render(<MixedText text="Chữ 学生 đọc là がくせい" />);
    expect([...container.querySelectorAll('[lang="ja"]')].map((e) => e.textContent)).toEqual(['学生', 'がくせい']);
    expect(container.textContent).toBe('Chữ 学生 đọc là がくせい');
  });
});
