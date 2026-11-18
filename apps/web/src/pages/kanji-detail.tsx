import { kanjiId } from '@j-learn-write/course';
import { useState } from 'preact/hooks';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { DraftBadge, MixedText, RubyMarkup } from '../components/text';
import { addCards, getCard } from '../lib/cards';
import { findKanji } from '../lib/content';
import { href } from '../router';
import { T } from '../strings';

/** Kun reading "た.べる" shown as "た(べる)": the okurigana in brackets. */
export const kunLabel = (kun: string) => kun.replace(/^([^.]*)\.(.+)$/, '$1($2)');

export default function KanjiPage({ params }: PageProps) {
  const char = params.char ?? '';
  const data = useAsync(async () => ({ entry: await findKanji(char), card: await getCard(kanjiId(char)) }), [char]);
  const [added, setAdded] = useState(false);
  if (data.loading) return <p class="loading">{T.loading}</p>;
  const entry = data.data?.entry;
  if (!entry) return <p class="card">{T.kanjiPage.notFound}</p>;
  const { kanji, content, lesson, words } = entry;
  const inReview = added || data.data!.card !== undefined;

  return (
    <section class="page kanji-page">
      <div class="card word-head">
        <h1 class="ja-big kanji-big" lang="ja">
          {kanji.char}
        </h1>
        <p class="hanviet" title={kanji.hanVietAmbiguous ? T.word.hanVietAmbiguous : undefined}>
          {T.kanjiPage.hanViet}: <strong>{kanji.hanViet || '—'}</strong>
          {kanji.hanVietAmbiguous ? ' *' : ''}
          {kanji.hanVietOthers.length > 0 && (
            <span class="muted">
              {' '}
              ({T.kanjiPage.hanVietOthers}: {kanji.hanVietOthers.join(', ')})
            </span>
          )}
        </p>
        <p class="muted">
          {T.levelName(kanji.level)} · {T.kanjiPage.strokes(kanji.strokes)}
        </p>
        {content && <DraftBadge item={content} />}
      </div>

      <div class="card">
        {content ? (
          <>
            <h2>{T.kanjiPage.meaning}</h2>
            <p class="meaning-big">
              <MixedText text={content.meaningVi} />
            </p>
            {content.noteVi && (
              <p class="note">
                <MixedText text={content.noteVi} />
              </p>
            )}
          </>
        ) : (
          <p>{T.kanjiPage.noContent}</p>
        )}
        <dl class="readings">
          {kanji.on.length > 0 && (
            <>
              <dt>{T.kanjiPage.on}</dt>
              <dd lang="ja">{kanji.on.join('、')}</dd>
            </>
          )}
          {kanji.kun.length > 0 && (
            <>
              <dt>{T.kanjiPage.kun}</dt>
              <dd lang="ja">{kanji.kun.map(kunLabel).join('、')}</dd>
            </>
          )}
        </dl>
        <a class="button" href={href(`/write/${encodeURIComponent(kanji.char)}`)}>
          {T.kanjiPage.write}
        </a>
      </div>

      {words.length > 0 && (
        <div class="card">
          <h2>{T.kanjiPage.words(words.length)}</h2>
          <ul class="link-list kanji-words">
            {words.map(({ word: w, content: c }) => (
              <li key={w.no}>
                <a href={href(`/word/${w.no}`)}>
                  <RubyMarkup markup={w.ruby} />
                </a>{' '}
                <span class="muted">{c ? <MixedText text={c.meaningsVi[0] ?? ''} /> : (w.hanViet ?? '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lesson && (
        <p>
          {T.word.lesson}:{' '}
          <a href={href(`/lesson/${lesson.meta.id}`)}>
            {T.lessonLabel(lesson.meta.level, lesson.meta.order)} — <MixedText text={lesson.meta.titleVi} />
          </a>
        </p>
      )}
      <p>
        <button
          type="button"
          class="button"
          disabled={inReview}
          onClick={async () => {
            await addCards([kanjiId(kanji.char)], new Date());
            setAdded(true);
          }}
        >
          {inReview ? T.word.inReview : T.word.addCard}
        </button>
      </p>
    </section>
  );
}
