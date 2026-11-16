/**
 * "Chấm thử": try the grader on the free-answer exercises of the course, and
 * run its rules on any sentence (for learners and for teachers checking it).
 */
import { exerciseQuestion, LEVELS, translateQuestion, type Exercise } from '@j-learn-write/course';
import { checkJaSentence, grade, JA_ISSUE_LABELS_VI, type GradeResult, type Question } from '@j-learn-write/grader';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { GradeResultView, scoreBand } from '../components/grade-result';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { MixedText } from '../components/text';
import { lessonsOf } from '../lib/content';
import { warmGrader } from '../lib/warm';
import { T } from '../strings';

type FreeExercise = Extract<Exercise, { type: 'translate' | 'question' }>;

async function freeExercises(): Promise<{ lesson: string; ex: FreeExercise }[]> {
  const out: { lesson: string; ex: FreeExercise }[] = [];
  for (const level of LEVELS) {
    for (const l of await lessonsOf(level)) {
      for (const ex of l.content?.exercises ?? []) if (ex.type === 'translate' || ex.type === 'question') out.push({ lesson: l.meta.id, ex });
    }
  }
  return out;
}

const questionOf = (ex: FreeExercise): Question => (ex.type === 'translate' ? translateQuestion(ex) : exerciseQuestion(ex));

export default function GraderPage(_props: PageProps) {
  useEffect(() => warmGrader(), []);
  const list = useAsync(freeExercises, []);
  const [id, setId] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [graded, setGraded] = useState<{ answer: string; result: GradeResult } | null>(null);
  const [sentence, setSentence] = useState('');
  const [checked, setChecked] = useState<ReturnType<typeof checkJaSentence> | null>(null);

  const items = list.data ?? [];
  const current = items.find((x) => x.ex.id === id) ?? items[0];
  const question = useMemo(() => (current ? questionOf(current.ex) : undefined), [current?.ex.id]);
  const check = (text: string) => question && setGraded({ answer: text, result: grade(question, text) });
  const example = graded && question ? question.examples?.find((ex) => ex.answer === graded.answer) : undefined;

  return (
    <section class="page grader-page">
      <h1>{T.grader.title}</h1>
      <p class="lead">{T.grader.intro}</p>

      {list.loading ? (
        <p class="loading">{T.loading}</p>
      ) : !current || !question ? (
        <p class="card">{T.grader.none}</p>
      ) : (
        <>
          <label class="label" for="grader-question">
            {T.grader.questions}
          </label>
          <select
            id="grader-question"
            value={current.ex.id}
            onChange={(e) => {
              setId((e.target as HTMLSelectElement).value);
              setAnswer('');
              setGraded(null);
            }}
          >
            {items.map(({ lesson, ex }) => (
              <option key={ex.id} value={ex.id}>
                {`${lesson} · ${ex.type === 'translate' ? ex.vi : (ex.question.promptVi ?? T.grader.question(ex.id))}`}
              </option>
            ))}
          </select>

          <div class="card question">
            {question.picture && (
              <div class="picture" aria-hidden="true">
                {question.picture}
              </div>
            )}
            <p class="prompt">
              <MixedText text={question.type === 'model' && current.ex.type === 'translate' ? `${T.exercise.translate} ${current.ex.vi}` : question.prompt} />
            </p>
            {question.promptVi && current.ex.type === 'question' && <p class="prompt-vi">{question.promptVi}</p>}
          </div>

          <form
            class="answer-form"
            autocomplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              check(answer);
            }}
          >
            <label for="grader-answer" class="visually-hidden">
              {T.grader.answerLabel}
            </label>
            <input id="grader-answer" type="text" value={answer} placeholder={T.exercise.typeHere} onInput={(e) => setAnswer((e.target as HTMLInputElement).value)} />
            <button type="submit" class="button primary">
              {T.grader.submit}
            </button>
          </form>

          {(question.examples?.length ?? 0) > 0 && (
            <>
              <h2 class="label">{T.grader.tryExamples}</h2>
              <div class="chips">
                {question.examples!.map((ex) => (
                  <button
                    key={ex.answer}
                    type="button"
                    class="chip example"
                    onClick={() => {
                      setAnswer(ex.answer);
                      check(ex.answer);
                    }}
                  >
                    <span lang="ja">{ex.answer}</span>
                    <span class={`badge ${scoreBand(ex.score)}`}>{ex.score}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {graded && (
            <div class="card result" aria-live="polite" data-testid="grade-result">
              <GradeResultView result={graded.result} />
              {example && (
                <p class={`line expected ${example.score === graded.result.score ? 'same' : 'different'}`}>
                  {T.grader.expected(example.score, example.score === graded.result.score, graded.result.score)}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <h2>{T.grader.sentenceTitle}</h2>
      <p class="muted">
        <MixedText text={T.grader.sentenceIntro} />
      </p>
      <form
        class="answer-form"
        autocomplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          setChecked(checkJaSentence(sentence));
        }}
      >
        <label for="grader-sentence" class="visually-hidden">
          {T.grader.sentenceTitle}
        </label>
        <input id="grader-sentence" type="text" value={sentence} placeholder={T.exercise.typeHere} onInput={(e) => setSentence((e.target as HTMLInputElement).value)} />
        <button type="submit" class="button">
          {T.grader.check}
        </button>
      </form>
      {checked && (
        <div class="card" aria-live="polite" data-testid="sentence-check">
          {checked.issues.length === 0 ? (
            <p>{T.grader.noIssue}</p>
          ) : (
            <ul class="issues">
              {checked.issues.map((i, k) => (
                <li key={k} class={`issue ${i.severity}`}>
                  <span class="issue-label">{JA_ISSUE_LABELS_VI[i.code as keyof typeof JA_ISSUE_LABELS_VI] ?? i.code}</span>
                  <span class="issue-message">
                    <MixedText text={i.message} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
