import { kanjiId, wordId, type KanaEntry } from '@j-learn-write/course';
import { useEffect, useState } from 'preact/hooks';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { SpeakButton } from '../components/speak';
import { DraftBadge, JaText, MixedText, RubyContext } from '../components/text';
import { addCards } from '../lib/cards';
import { findLesson, kanaList, kanjiList, lessonApproved, listWords } from '../lib/content';
import { startLesson } from '../lib/progress';
import { romajiTable, romanize } from '../lib/romaji';
import { href } from '../router';
import { T } from '../strings';

function KanaCells({ items }: { items: readonly KanaEntry[] }) {
  return (
    <div class="kana-grid lesson-kana" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
      {items.map((k) => (
        <a key={k.kana} class="kana-cell" href={href(`/kana/${encodeURIComponent(k.kana)}`)}>
          <span class="kana-char" lang="ja">
            {k.kana}
          </span>
          <span class="kana-romaji">{k.romaji || '·'}</span>
        </a>
      ))}
    </div>
  );
}

export default function LessonPage({ params }: PageProps) {
  const id = params.id ?? '';
  const data = useAsync(async () => ({ lesson: await findLesson(id), kana: await kanaList(), words: await listWords(), kanji: await kanjiList() }), [id]);
  const [added, setAdded] = useState<number | null>(null);

  useEffect(() => {
    if (data.data?.lesson?.content) void startLesson(id, new Date());
  }, [data.data]);

  if (data.loading) return <p class="loading">{T.loading}</p>;
  const l = data.data?.lesson;
  if (!l) return <p class="card">{T.lesson.notFound}</p>;
  const { meta, content } = l;
  const kanaByChar = new Map(data.data!.kana.map((k) => [k.kana, k]));
  const kana = (meta.kana ?? []).map((c) => kanaByChar.get(c)).filter((k): k is KanaEntry => k !== undefined);
  const table = romajiTable(data.data!.kana);

  return (
    <section class="page lesson-page">
      <p class="muted">{T.lessonLabel(meta.level, meta.order)}</p>
      <h1>
        <MixedText text={meta.titleVi} />
      </h1>
      <p class="lead">
        <MixedText text={meta.topicVi} />
      </p>
      {content && !lessonApproved(content) && (
        <p class="draft-note">
          <span class="badge draft">{T.draftBadge}</span> {T.lesson.draftNote}
        </p>
      )}
      {!content ? (
        <p class="card">{T.lesson.writing}</p>
      ) : (
        <RubyContext.Provider value={{ ruby: content.ruby ?? {} }}>
          <div class="card">
            <h2>{T.lesson.goals}</h2>
            <ul>
              {content.goalsVi.map((g) => (
                <li key={g}>
                  <MixedText text={g} />
                </li>
              ))}
            </ul>
          </div>

          {kana.length > 0 && (
            <div class="card">
              <h2>{T.lesson.kana(kana.length)}</h2>
              <p class="muted">{T.lesson.kanaHint}</p>
              <KanaCells items={kana} />
            </div>
          )}

          {(content.words?.length ?? 0) > 0 && (
            <div class="card">
              <h2>{T.lesson.words(content.words!.length)}</h2>
              <ul class="word-grid">
                {content.words!.map((w) => {
                  const listed = data.data!.words.get(w.no);
                  return (
                    <li key={w.no}>
                      <a class="word-chip" href={href(`/word/${w.no}`)}>
                        <span class="ja-word" lang="ja">
                          {w.word}
                        </span>
                        {listed && listed.reading !== w.word && (
                          <span class="reading" lang="ja">
                            {listed.reading}
                          </span>
                        )}
                        <span class="meaning">
                          <MixedText text={w.meaningsVi[0] ?? ''} />
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {(content.kanji?.length ?? 0) > 0 && (
            <div class="card">
              <h2>{T.lesson.kanji(content.kanji!.length)}</h2>
              <ul class="kanji-chips">
                {content.kanji!.map((k) => (
                  <li key={k.char}>
                    <a class="kanji-chip" href={href(`/kanji/${encodeURIComponent(k.char)}`)}>
                      <span class="ja-word" lang="ja">
                        {k.char}
                      </span>
                      <span class="hanviet">{data.data!.kanji.get(k.char)?.hanViet}</span>
                      <span class="meaning">
                        <MixedText text={k.meaningVi} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(content.words?.length ?? 0) + (content.kanji?.length ?? 0) > 0 && (
            <div class="card">
              <button
                type="button"
                class="button primary"
                onClick={async () => setAdded(await addCards([...(content.words ?? []).map((w) => wordId(w.no)), ...(content.kanji ?? []).map((k) => kanjiId(k.char))], new Date()))}
              >
                {T.lesson.addCards}
              </button>
              {added !== null && (
                <p class="notice ok" role="status">
                  {T.lesson.cardsAdded(added)} <a href={href('/review')}>{T.review.start}</a>
                </p>
              )}
            </div>
          )}

          {(content.grammar?.length ?? 0) > 0 && (
            <div class="card">
              <h2>{T.lesson.grammar(content.grammar!.length)}</h2>
              <ul class="link-list grammar-list">
                {content.grammar!.map((g) => (
                  <li key={g.id}>
                    <a href={href(`/grammar/${g.id}`)}>
                      <MixedText text={g.titleVi} />
                    </a>{' '}
                    <DraftBadge item={g} />
                    <div class="muted">
                      <MixedText text={g.summaryVi} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.practice && content.practice.length > 0 && (
            <div class="card">
              <h2>{T.lesson.practiceWords(content.practice.length)}</h2>
              <p class="muted">{T.lesson.practiceWordsHint}</p>
              <ul class="practice-list">
                {content.practice.map((p) => (
                  <li key={p.ja}>
                    <JaText text={p.ja} class="practice-ja" />
                    <span class="practice-romaji">{romanize(p.ja, table)}</span>
                    <span class="practice-vi">{p.vi}</span>
                    <SpeakButton text={p.ja} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div class="card">
            <h2>{T.lesson.practice}</h2>
            <p>{T.lesson.practiceIntro(content.exercises.length)}</p>
            <a class="button primary" href={href(`/practice/${meta.id}`)}>
              {T.lesson.startPractice}
            </a>
          </div>

          <div class="card">
            <h2>{T.lesson.quiz}</h2>
            <p>{T.lesson.quizIntro}</p>
            <a class="button" href={href(`/quiz/${meta.id}`)}>
              {T.lesson.startQuiz}
            </a>
          </div>
        </RubyContext.Provider>
      )}
    </section>
  );
}
