import { render } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { JaText, RubyContext, readingOf } from '../src/components/text';
import { learnedKanji } from '../src/lib/learned';
import { settings, DEFAULT_SETTINGS, type FuriganaMode } from '../src/lib/settings';

const ruby = { '私は学生です。': '{私|わたし}は{学|がく}{生|せい}です。' };

function readings(mode: FuriganaMode, learned: string[]): string[] {
  settings.value = { ...DEFAULT_SETTINGS, furigana: mode };
  learnedKanji.value = new Set(learned);
  const { container, unmount } = render(
    <RubyContext.Provider value={{ ruby }}>
      <JaText text="私は学生です。" />
    </RubyContext.Provider>,
  );
  const out = [...container.querySelectorAll('rt')].map((rt) => rt.textContent ?? '');
  expect(container.textContent?.replace(/<rt>.*?<\/rt>/g, '')).toContain('です');
  unmount();
  return out;
}

afterEach(() => {
  settings.value = { ...DEFAULT_SETTINGS };
  learnedKanji.value = new Set();
});

describe('furigana', () => {
  it('shows readings over every kanji ("always"), none ("never"), or only unlearned kanji ("auto")', () => {
    expect(readings('always', ['私'])).toEqual(['わたし', 'がく', 'せい']);
    expect(readings('never', [])).toEqual([]);
    expect(readings('auto', [])).toEqual(['わたし', 'がく', 'せい']);
    expect(readings('auto', ['私', '学'])).toEqual(['せい']);
  });

  it('reads sentences aloud from their kana reading', () => {
    expect(readingOf('私は学生です。', ruby)).toBe('わたしはがくせいです。');
    expect(readingOf('こんにちは。', ruby)).toBe('こんにちは。');
  });
});
