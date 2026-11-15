/**
 * Text helpers. Japanese inside Vietnamese text must carry lang="ja" so that
 * browsers pick a Japanese font (Chinese glyph shapes differ for 直, 今, 骨…).
 */
import { effectiveStatus, parseRuby, rubyText, type Review, type RubySegment } from '@j-learn-write/course';
import { isKanji } from '@j-learn-write/grader';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { settings, type FuriganaMode } from '../lib/settings';
import { T } from '../strings';

/** Runs of Japanese script: kana, kanji, ー, 々 and Japanese punctuation. */
const JAPANESE_RUN = /([、-〿぀-ヿ㐀-鿿豈-﫿！-／：-＠]+)/u;
const HAS_KANA_OR_KANJI = /[぀-ヿ㐀-鿿豈-﫿]/u;

/** Splits text into plain and Japanese runs (a run of punctuation alone stays plain). */
export function splitJapanese(text: string): { text: string; ja: boolean }[] {
  return text
    .split(JAPANESE_RUN)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, ja: HAS_KANA_OR_KANJI.test(part) }));
}

/** Vietnamese text that may contain Japanese words: each Japanese run gets lang="ja". */
export function MixedText({ text }: { text: string }) {
  return (
    <>
      {splitJapanese(text).map((part, i) =>
        part.ja ? (
          <span key={i} lang="ja">
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </>
  );
}

/** Furigana of the texts on screen (a lesson's `ruby` map) and the kanji the learner has learned. */
export interface RubyInfo {
  ruby: Readonly<Record<string, string>>;
  learned: ReadonlySet<string>;
}

export const RubyContext = createContext<RubyInfo>({ ruby: {}, learned: new Set() });

/** True when a furigana segment should show its reading under the current setting. */
export function showsReading(segment: RubySegment, mode: FuriganaMode, learned: ReadonlySet<string>): boolean {
  if (!segment.rt || mode === 'never') return false;
  return mode === 'always' || [...segment.text].some((c) => isKanji(c) && !learned.has(c));
}

/**
 * A Japanese text with furigana from the lesson's markup ("auto": only over
 * kanji not learned yet). Texts without markup are shown as they are.
 */
export function JaText({ text, class: className }: { text: string; class?: string }) {
  const { ruby, learned } = useContext(RubyContext);
  const markup = ruby[text];
  const mode = settings.value.furigana;
  if (!markup || rubyText(markup) !== text || mode === 'never') {
    return (
      <span lang="ja" class={className}>
        {text}
      </span>
    );
  }
  return (
    <span lang="ja" class={className ? `${className} ruby-line` : 'ruby-line'}>
      {parseRuby(markup).map((s, i) =>
        showsReading(s, mode, learned) ? (
          <ruby key={i}>
            {s.text}
            <rt>{s.rt}</rt>
          </ruby>
        ) : (
          s.text
        ),
      )}
    </span>
  );
}

/** "Chưa duyệt" badge for content not approved by a teacher. */
export function DraftBadge({ item }: { item: { review?: Review } }) {
  if (effectiveStatus(item) === 'approved') return null;
  return (
    <span class="badge draft" title={T.draftHint}>
      {T.draftBadge}
    </span>
  );
}
