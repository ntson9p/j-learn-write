import { CURRICULUM, hasContent, LEVELS, type LevelId } from '@j-learn-write/course';
import { useState } from 'preact/hooks';
import { useAsync } from '../components/hooks';
import { MixedText } from '../components/text';
import type { PageProps } from '../components/lazy';
import { sessionFor } from '../lib/cards';
import { allLessonProgress, lessonStates, startLesson } from '../lib/progress';
import { settings } from '../lib/settings';
import { href, navigate } from '../router';
import { T } from '../strings';

export default function HomePage(_props: PageProps) {
  const [level, setLevel] = useState<LevelId>('kana');
  const progress = useAsync(allLessonProgress, []);
  const session = useAsync(() => sessionFor(new Date(), settings.value.newWordsPerDay), []);
  const lessons = CURRICULUM.filter((l) => l.level === level).sort((a, b) => a.order - b.order);
  const states = lessonStates(
    lessons.map((l) => ({ id: l.id, hasContent: hasContent(l) })),
    progress.data ?? new Map(),
  );

  return (
    <section class="page home-page">
      <h1>{T.home.title}</h1>
      <p class="lead">{T.home.intro}</p>

      {session.data && session.data.queue.length > 0 && (
        <a class="card due-banner" href={href('/review')}>
          <span>{T.home.dueToday(session.data.queue.length)}</span>
          <span class="button primary">{T.home.goReview}</span>
        </a>
      )}

      <div class="tabs" role="tablist" aria-label={T.home.levels}>
        {LEVELS.map((l) => (
          <button key={l} type="button" role="tab" aria-selected={l === level} class={l === level ? 'tab active' : 'tab'} onClick={() => setLevel(l)}>
            {T.levelName(l)}
          </button>
        ))}
      </div>
      <p class="muted">
        {level === 'kana'
          ? T.home.kanaSummary
          : T.home.levelSummary(
              lessons.reduce((n, l) => n + (l.words?.length ?? 0), 0),
              lessons.reduce((n, l) => n + (l.kanji?.length ?? 0), 0),
              lessons.reduce((n, l) => n + (l.grammar?.length ?? 0), 0),
            )}
      </p>
      {level !== 'kana' && <p class="muted small">{T.home.unofficial}</p>}
      <p class="button-row">
        {level === 'kana' && (
          <a class="button" href={href('/kana')}>
            {T.kana.homeLink}
          </a>
        )}
        <a class="button" href={href('/write')}>
          {T.writing.homeLink}
        </a>
      </p>
      {lessons.length === 0 && <p class="card">{T.home.comingSoon}</p>}
      <ol class="lesson-list">
        {lessons.map((l, i) => {
          const state = states[i]!;
          const p = progress.data?.get(l.id);
          const clickable = state !== 'writing' && state !== 'locked';
          return (
            <li key={l.id} class={`lesson-item ${state}`}>
              <a class="lesson-link" href={clickable ? href(`/lesson/${l.id}`) : undefined} aria-disabled={!clickable}>
                <span class="lesson-order">{l.order}</span>
                <span class="lesson-text">
                  <span class="lesson-title">
                    <MixedText text={l.titleVi} />
                  </span>
                  <span class="lesson-topic muted">
                    <MixedText text={l.topicVi} />
                  </span>
                  {p && p.bestScore > 0 && <span class="muted">{T.home.bestScore(p.bestScore)}</span>}
                </span>
                <span class={`state-badge ${state}`}>{T.home.state[state]}</span>
              </a>
              {state === 'locked' && (
                <button
                  type="button"
                  class="button small"
                  onClick={async () => {
                    if (!confirm(T.home.skipConfirm)) return;
                    await startLesson(l.id, new Date());
                    navigate(`/lesson/${l.id}`);
                  }}
                >
                  {T.home.skipAhead}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
