import { wordId } from '@j-learn-write/course';
import { isKanji } from '@j-learn-write/grader';
import { useState } from 'preact/hooks';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { SpeakButton } from '../components/speak';
import { DraftBadge, JaSentence, MixedText, RubyContext, RubyMarkup } from '../components/text';
import { addCards, getCard } from '../lib/cards';
import { findWord, kanjiList } from '../lib/content';
import { posLabels } from '../lib/pos';
import { href } from '../router';
import { T } from '../strings';

export default function WordPage({ params }: PageProps) {
  const no = Number(params.no);
  const data = useAsync(async () => ({ entry: await findWord(no), kanji: await kanjiList(), card: await getCard(wordId(no)) }), [no]);
  const [added, setAdded] = useState(false);
  if (data.loading) return <p class="loading">{T.loading}</p>;
  const entry = data.data?.entry;
  if (!entry) return <p class="card">{T.word.notFound}</p>;
  const { word, content, lesson } = entry;
  const kanjiInWord = [...new Set([...word.word].filter(isKanji))].filter((c) => data.data!.kanji.has(c));
  const otherForms = word.forms.filter((f) => f !== word.word && f !== word.reading);
  const inReview = added || data.data!.card !== undefined;

  return (
    <section class="page word-page">
      <div class="card word-head">
        <div class="word-main">
          <h1 class="ja-big" lang="ja">
            {word.word}
          </h1>
          <SpeakButton text={word.reading} label={T.speak(word.word)} />
        </div>
        {word.word !== word.reading && (
          <p class="reading-big">
            <RubyMarkup markup={word.ruby} />
            <span class="visually-hidden">: </span>
            <span lang="ja"> {word.reading}</span>
          </p>
        )}
        {word.hanViet && (
          <p class="hanviet" title={word.hanVietAmbiguous ? T.word.hanVietAmbiguous : undefined}>
            {T.word.hanViet}: <strong>{word.hanViet}</strong>
            {word.hanVietAmbiguous ? ' *' : ''}
          </p>
        )}
        <p class="muted">
          {T.levelName(word.level)} · {posLabels(word.pos).join(', ')}
        </p>
        {word.extra && <p class="muted small">{T.word.extra}</p>}
        {content && <DraftBadge item={content} />}
      </div>

      {!content ? (
        <p class="card">{T.word.noContent}</p>
      ) : (
        <RubyContext.Provider value={{ ruby: lesson?.content?.ruby ?? {} }}>
          <div class="card">
            <h2>{T.word.meanings}</h2>
            <ol class="meanings">
              {content.meaningsVi.map((m) => (
                <li key={m}>
                  <MixedText text={m} />
                </li>
              ))}
            </ol>
            {content.noteVi && (
              <p class="note">
                <strong>{T.word.note}:</strong> <MixedText text={content.noteVi} />
              </p>
            )}
          </div>
          <div class="card">
            <h2>{T.word.examples}</h2>
            <ul class="examples">
              {content.examples.map((s) => (
                <li key={s.ja}>
                  <div class="example-ja">
                    <JaSentence text={s.ja} />
                  </div>
                  <div class="example-vi">{s.vi}</div>
                </li>
              ))}
            </ul>
          </div>
        </RubyContext.Provider>
      )}

      {kanjiInWord.length > 0 && (
        <div class="card">
          <h2>{T.word.kanji}</h2>
          <ul class="kanji-chips">
            {kanjiInWord.map((c) => {
              const k = data.data!.kanji.get(c)!;
              return (
                <li key={c}>
                  <a class="kanji-chip" href={href(`/kanji/${encodeURIComponent(c)}`)}>
                    <span class="ja-word" lang="ja">
                      {c}
                    </span>
                    <span class="hanviet">{k.hanViet}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {otherForms.length > 0 && (
        <p class="muted">
          {T.word.forms}: <span lang="ja">{otherForms.join('、')}</span>
        </p>
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
            await addCards([wordId(no)], new Date());
            setAdded(true);
          }}
        >
          {inReview ? T.word.inReview : T.word.addCard}
        </button>
      </p>
    </section>
  );
}
