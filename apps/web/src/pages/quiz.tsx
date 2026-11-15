import type { Exercise } from '@j-learn-write/course';
import { useState } from 'preact/hooks';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { ExerciseRun, type Answered } from '../components/run';
import { MixedText, RubyContext } from '../components/text';
import { findLesson } from '../lib/content';
import { shuffle } from '../lib/exercises';
import { PASS_MARK, recordQuiz } from '../lib/progress';
import { addResult, averageScore, resultsFor, weakGrammar } from '../lib/results';
import { href } from '../router';
import { T } from '../strings';

export const QUIZ_SIZE = 12;
const NO_LEARNED: ReadonlySet<string> = new Set();

/** Quiz questions: a seeded selection of the lesson's exercises (no matching), different at each attempt. */
export function quizExercises(lessonId: string, exercises: readonly Exercise[], attempt: number): Exercise[] {
  return shuffle(
    exercises.filter((e) => e.type !== 'match'),
    `${lessonId}#quiz#${attempt}`,
  ).slice(0, QUIZ_SIZE);
}

export default function QuizPage({ params }: PageProps) {
  const id = params.id ?? '';
  const data = useAsync(async () => {
    const lesson = await findLesson(id);
    const past = lesson ? await resultsFor('lesson', { level: lesson.meta.level, lessonId: id }) : [];
    return { lesson, attempt: past.length };
  }, [id]);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [score, setScore] = useState<{ value: number; weak: string[] } | null>(null);

  if (data.loading) return <p class="loading">{T.loading}</p>;
  const lesson = data.data?.lesson;
  if (!lesson?.content) return <p class="card">{T.lesson.notFound}</p>;
  const content = lesson.content;
  const questions = quizExercises(id, content.exercises, data.data!.attempt);

  const finish = async (answers: Answered[]) => {
    const value = averageScore(answers.map((a) => a.outcome.score));
    const weak = weakGrammar(answers.map((a) => ({ correct: a.outcome.correct, grammar: 'grammar' in a.exercise ? a.exercise.grammar : undefined })));
    await addResult({ kind: 'lesson', level: lesson.meta.level, lessonId: id, score: value, at: Date.now(), durationMs: Date.now() - startedAt, weakGrammar: weak });
    await recordQuiz(id, value, new Date());
    setScore({ value, weak });
  };

  const titleOf = (gid: string) => content.grammar?.find((g) => g.id === gid)?.titleVi ?? gid;

  return (
    <section class="page quiz-page">
      <p class="muted">
        <a href={href(`/lesson/${id}`)}>{T.practice.backToLesson}</a>
      </p>
      <h1>
        <MixedText text={T.quiz.title(lesson.meta.titleVi)} />
      </h1>
      {score ? (
        <div class="card" data-testid="quiz-result">
          <p class="score-line">{T.quiz.result(score.value)}</p>
          <p class={`notice ${score.value >= PASS_MARK ? 'ok' : 'error'}`} role="status">
            {score.value >= PASS_MARK ? T.quiz.passed : T.quiz.failed}
          </p>
          {score.weak.length > 0 && (
            <>
              <p>{T.quiz.weak}</p>
              <ul>
                {score.weak.map((gid) => (
                  <li key={gid}>
                    <MixedText text={titleOf(gid)} />
                  </li>
                ))}
              </ul>
            </>
          )}
          <div class="button-row">
            <button type="button" class="button" onClick={() => (setScore(null), setStarted(false), data.reload())}>
              {T.quiz.retry}
            </button>
            <a class="button primary" href={href('/')}>
              {T.backHome}
            </a>
          </div>
        </div>
      ) : !started ? (
        <div class="card">
          <p>{T.quiz.intro(questions.length)}</p>
          <button type="button" class="button primary" onClick={() => (setStartedAt(Date.now()), setStarted(true))}>
            {T.quiz.start}
          </button>
        </div>
      ) : (
        <RubyContext.Provider value={{ ruby: content.ruby ?? {}, learned: NO_LEARNED }}>
          <ExerciseRun exercises={questions} onFinish={(a) => void finish(a)} />
        </RubyContext.Provider>
      )}
    </section>
  );
}
