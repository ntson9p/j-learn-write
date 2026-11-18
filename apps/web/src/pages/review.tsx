import { useState } from 'preact/hooks';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { SpeakButton } from '../components/speak';
import { JaSentence, MixedText, RubyContext, RubyMarkup } from '../components/text';
import { answerCard, SAME_SESSION_MS, sessionFor } from '../lib/cards';
import { findKanji, findWord, type KanjiEntry, type WordEntry } from '../lib/content';
import type { StoredCard } from '../lib/db';
import { settings } from '../lib/settings';
import { formatInterval, isNewCard, previewIntervals, RATINGS, type Rating } from '../lib/srs';
import { href } from '../router';
import { T } from '../strings';
import { kunLabel } from './kanji-detail';

/** What a card asks about: "w0001" is a word, "k学" a kanji. */
type CardSubject = { kind: 'word'; entry: WordEntry } | { kind: 'kanji'; entry: KanjiEntry };

async function subjectOf(id: string): Promise<CardSubject | undefined> {
  if (id.startsWith('k')) {
    const entry = await findKanji(id.slice(1));
    return entry && { kind: 'kanji', entry };
  }
  const entry = await findWord(Number(id.slice(1)));
  return entry && { kind: 'word', entry };
}

function Front({ subject }: { subject: CardSubject }) {
  if (subject.kind === 'kanji') {
    return (
      <span class="ja-big kanji-big" lang="ja">
        {subject.entry.kanji.char}
      </span>
    );
  }
  const w = subject.entry.word;
  return (
    <>
      <span class="ja-big" lang="ja">
        {w.word}
      </span>
      <SpeakButton text={w.reading} label={T.speak(w.word)} />
    </>
  );
}

function Back({ subject }: { subject: CardSubject }) {
  if (subject.kind === 'kanji') {
    const { kanji, content } = subject.entry;
    return (
      <div class="card-back">
        <p class="hanviet">{kanji.hanViet}</p>
        <p class="meaning-big">{content ? <MixedText text={content.meaningVi} /> : null}</p>
        <p class="muted" lang="ja">
          {[...kanji.on, ...kanji.kun.map(kunLabel)].join('、')}
        </p>
        <a href={href(`/kanji/${encodeURIComponent(kanji.char)}`)}>{T.review.open}</a>
      </div>
    );
  }
  const { word, content, lesson } = subject.entry;
  const example = content?.examples[0];
  return (
    <div class="card-back">
      <p class="reading-big">
        <RubyMarkup markup={word.ruby} />
      </p>
      {word.word !== word.reading && (
        <p lang="ja" class="muted">
          {word.reading}
        </p>
      )}
      {word.hanViet && <p class="hanviet">{word.hanViet}</p>}
      <p class="meaning-big">{content ? <MixedText text={content.meaningsVi.join('; ')} /> : word.hanViet}</p>
      {example && (
        <RubyContext.Provider value={{ ruby: lesson?.content?.ruby ?? {} }}>
          <div class="example">
            <div class="example-ja">
              <JaSentence text={example.ja} />
            </div>
            <div class="example-vi">{example.vi}</div>
          </div>
        </RubyContext.Provider>
      )}
      <a href={href(`/word/${word.no}`)}>{T.review.open}</a>
    </div>
  );
}

export default function ReviewPage(_props: PageProps) {
  const plan = useAsync(() => sessionFor(new Date(), settings.value.newWordsPerDay), []);
  const [queue, setQueue] = useState<StoredCard[] | null>(null);
  const [shown, setShown] = useState(false);
  const [answered, setAnswered] = useState(0);
  const current = queue?.[0];
  const subject = useAsync(async () => (current ? subjectOf(current.wordId) : undefined), [current?.wordId, current?.reps]);

  if (plan.loading) return <p class="loading">{T.loading}</p>;
  const p = plan.data;

  if (!queue) {
    return (
      <section class="page review-page">
        <h1>{T.review.title}</h1>
        {!p || p.queue.length === 0 ? (
          <p class="card">{answered > 0 ? T.review.nothingDue : T.review.empty}</p>
        ) : (
          <div class="card">
            <p>{T.review.summary(p.due, p.fresh)}</p>
            <button type="button" class="button primary" onClick={() => setQueue(p.queue)}>
              {T.review.start}
            </button>
          </div>
        )}
        <p>
          <a href={href('/')}>{T.backHome}</a>
        </p>
      </section>
    );
  }

  if (!current) {
    return (
      <section class="page review-page">
        <h1>{T.review.title}</h1>
        <p class="card notice ok" role="status">
          {T.review.done(answered)}
        </p>
        <button
          type="button"
          class="button"
          onClick={() => {
            setQueue(null);
            plan.reload();
          }}
        >
          {T.review.again}
        </button>
      </section>
    );
  }

  const intervals = previewIntervals(current, new Date());
  const answer = async (rating: Rating) => {
    const next = await answerCard(current, rating, new Date());
    setAnswered((n) => n + 1);
    setShown(false);
    const rest = queue.slice(1);
    // Learning steps: a card due again within the session comes back at the end.
    setQueue(next.due - Date.now() <= SAME_SESSION_MS ? [...rest, next] : rest);
  };
  const s = subject.data;

  return (
    <section class="page review-page">
      <h1 class="visually-hidden">{T.review.title}</h1>
      <p class="muted" aria-live="polite">
        {T.review.remaining(queue.length)}
      </p>
      <div class="card flashcard" data-testid="flashcard">
        <p>
          {isNewCard(current) && <span class="badge ok">{T.review.newBadge}</span>} {s?.kind === 'kanji' && <span class="badge">{T.review.kanjiBadge}</span>}
        </p>
        <div class="word-main">{s ? <Front subject={s} /> : '…'}</div>
        {shown && s && <Back subject={s} />}
      </div>
      {!shown ? (
        <button type="button" class="button primary wide" onClick={() => setShown(true)}>
          {T.review.show}
        </button>
      ) : (
        <div class="rating-row" role="group">
          {RATINGS.map((r) => (
            <button key={r} type="button" class={`button rating r${r}`} onClick={() => void answer(r)}>
              <span>{T.review.ratings[r]}</span>
              <span class="hint">{formatInterval(intervals[r])}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
