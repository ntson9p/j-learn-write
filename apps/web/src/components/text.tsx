/**
 * Text helpers. Japanese inside Vietnamese text must carry lang="ja" so that
 * browsers pick a Japanese font (Chinese glyph shapes differ for 直, 今, 骨…).
 */

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
