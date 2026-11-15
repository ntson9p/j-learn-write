/**
 * Text helpers. Japanese inside Vietnamese text must carry lang="ja" so that
 * browsers pick a Japanese font (Chinese glyph shapes differ for 直, 今, 骨…).
 */
import { effectiveStatus, parseRuby, rubyReading, rubyText, type Review, type RubySegment } from '@j-learn-write/course';
import { isKanji } from '@j-learn-write/grader';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { learnedKanji } from '../lib/learned';
import { settings, type FuriganaMode } from '../lib/settings';
import { T } from '../strings';
import { SpeakButton } from './speak';

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

/** Explanation text: `**bold**` is rendered bold; Japanese runs get lang="ja". */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
        p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
          <strong key={i}>
            <MixedText text={p.slice(2, -2)} />
          </strong>
        ) : (
          <MixedText key={i} text={p} />
        ),
      )}
    </>
  );
}

/** Furigana of the texts on screen: the `ruby` map of the lesson they come from. */
export interface RubyInfo {
  ruby: Readonly<Record<string, string>>;
}

export const RubyContext = createContext<RubyInfo>({ ruby: {} });

/** True when a furigana segment should show its reading under the current setting. */
export function showsReading(segment: RubySegment, mode: FuriganaMode, learned: ReadonlySet<string>): boolean {
  if (!segment.rt || mode === 'never') return false;
  return mode === 'always' || [...segment.text].some((c) => isKanji(c) && !learned.has(c));
}

/** Kana reading of a text from its furigana markup (the text itself when it has none). */
export function readingOf(text: string, ruby: Readonly<Record<string, string>>): string {
  const markup = ruby[text];
  return markup && rubyText(markup) === text ? rubyReading(markup) : text;
}

/** Furigana markup rendered under the current setting ("auto": only over kanji not learned yet). */
export function RubyMarkup({ markup, class: className }: { markup: string; class?: string }) {
  const mode = settings.value.furigana;
  const learned = learnedKanji.value;
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

/** A Japanese text with furigana from the lesson's markup. Texts without markup are shown as they are. */
export function JaText({ text, class: className }: { text: string; class?: string }) {
  const { ruby } = useContext(RubyContext);
  const markup = ruby[text];
  if (!markup || rubyText(markup) !== text) {
    return (
      <span lang="ja" class={className}>
        {text}
      </span>
    );
  }
  return <RubyMarkup markup={markup} class={className} />;
}

/** A Japanese sentence with furigana and a speaker button that reads its kana reading. */
export function JaSentence({ text, class: className }: { text: string; class?: string }) {
  const { ruby } = useContext(RubyContext);
  return (
    <span class="ja-sentence">
      <JaText text={text} class={className} />
      <SpeakButton text={readingOf(text, ruby)} label={T.speak(text)} />
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
