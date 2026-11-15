import type { KanaEntry, Lesson } from '@j-learn-write/course';
import { useState } from 'preact/hooks';
import type { AnyExercise } from '../components/exercise';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { ExerciseRun, type Answered } from '../components/run';
import { MixedText, RubyContext } from '../components/text';
import { findLesson, kanaList, kanaTaughtUpTo } from '../lib/content';
import { kanaDrills, practiceDrills, type Drill } from '../lib/exercises';
import { recordExercise } from '../lib/progress';
import { romajiTable } from '../lib/romaji';
import { voices } from '../lib/speech';
import { href } from '../router';
import { T } from '../strings';

/** Generated drills of a lesson (kana stage: its kana and practice words). */
export function lessonDrills(lesson: Lesson, kana: readonly KanaEntry[], taughtSoFar: readonly string[], listening: boolean): Drill[] {
  const content = lesson.content;
  if (!content) return [];
  const byChar = new Map(kana.map((k) => [k.kana, k]));
  const entries = (chars: readonly string[]) => chars.map((c) => byChar.get(c)).filter((k): k is KanaEntry => k !== undefined);
  const id = lesson.meta.id;
  return [
    ...kanaDrills(id, entries(lesson.meta.kana ?? []), entries(taughtSoFar), { count: 6, listening }),
    ...practiceDrills(id, content.practice ?? [], romajiTable(kana), { count: 4, listening }),
  ];
}

export default function PracticePage({ params }: PageProps) {
  const id = params.id ?? '';
  const data = useAsync(async () => {
    const lesson = await findLesson(id);
    const taught = lesson?.meta.level === 'kana' ? await kanaTaughtUpTo(id) : [];
    return { lesson, kana: await kanaList(), taught };
  }, [id]);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<Answered[] | null>(null);

  if (data.loading) return <p class="loading">{T.loading}</p>;
  const lesson = data.data?.lesson;
  if (!lesson?.content) return <p class="card">{T.lesson.notFound}</p>;
  const content = lesson.content;
  const drills = lessonDrills(lesson, data.data!.kana, data.data!.taught, voices.value.length > 0);
  const list: AnyExercise[] = [...drills, ...content.exercises];
  const authored = new Set(content.exercises.map((e) => e.id));

  return (
    <section class="page practice-page">
      <p class="muted">
        <a href={href(`/lesson/${id}`)}>{T.practice.backToLesson}</a>
      </p>
      <h1>
        <MixedText text={T.practice.title(lesson.meta.titleVi)} />
      </h1>
      {result ? (
        <div class="card">
          <p class="notice ok" role="status">
            {T.practice.done(result.filter((a) => a.outcome.correct).length, result.length)}
          </p>
          <div class="button-row">
            <button type="button" class="button" onClick={() => (setResult(null), setRun((r) => r + 1))}>
              {T.practice.again}
            </button>
            <a class="button primary" href={href(`/quiz/${id}`)}>
              {T.practice.toQuiz}
            </a>
          </div>
        </div>
      ) : (
        <RubyContext.Provider value={{ ruby: content.ruby ?? {} }}>
          <ExerciseRun
            key={run}
            exercises={list}
            onAnswer={(a) => {
              if (authored.has(a.exercise.id)) {
                void recordExercise(id, a.exercise.id, { correct: a.outcome.correct, score: a.outcome.score, at: Date.now() }, new Date());
              }
            }}
            onFinish={setResult}
          />
        </RubyContext.Provider>
      )}
    </section>
  );
}
