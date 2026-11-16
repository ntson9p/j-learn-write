/**
 * One exercise: the learner answers, presses "Kiểm tra", sees the verdict
 * with the expected answer and explanations. Calls `onChecked` once.
 */
import type { Exercise } from '@j-learn-write/course';
import { JA_ISSUE_LABELS_VI } from '@j-learn-write/grader';
import { useContext, useMemo, useRef, useState } from 'preact/hooks';
import { acceptedForms, check, needsJapaneseKeyboard, shuffle, shuffledTiles, type Answer, type Drill, type Outcome } from '../lib/exercises';
import { settings } from '../lib/settings';
import { speak, voices } from '../lib/speech';
import { href } from '../router';
import { T } from '../strings';
import { GradeResultView } from './grade-result';
import { SpeakButton } from './speak';
import { JaText, MixedText, readingOf, RubyContext } from './text';

export type AnyExercise = Exercise | Drill;

interface Props {
  exercise: AnyExercise;
  onChecked: (outcome: Outcome) => void;
}

function Feedback({ outcome, exercise }: { outcome: Outcome; exercise: AnyExercise }) {
  const explain = 'explainVi' in exercise ? exercise.explainVi : undefined;
  return (
    <div class={`feedback ${outcome.correct ? 'good' : 'bad'}`} role="status" aria-live="polite">
      <p class="verdict-line">
        <strong>{outcome.correct ? T.exercise.correct : T.exercise.wrong}</strong>
        {(outcome.result || !outcome.correct) && outcome.score > 0 && ` ${T.exercise.partly(outcome.score)}`}
      </p>
      {outcome.result && <GradeResultView result={outcome.result} compact />}
      {outcome.issues && outcome.issues.length > 0 && (
        <>
          <p>{T.exercise.orderIssues}</p>
          <ul class="issues">
            {outcome.issues.map((i, k) => (
              <li key={k} class="issue error">
                <span class="issue-label">{JA_ISSUE_LABELS_VI[i.code as keyof typeof JA_ISSUE_LABELS_VI] ?? i.code}</span>
                <span class="issue-message">
                  <MixedText text={i.message} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {!outcome.correct && outcome.expected && (
        <p>
          {T.exercise.expected} <MixedText text={outcome.expected} />
        </p>
      )}
      {explain && (
        <p>
          {T.exercise.explain} <MixedText text={explain} />
        </p>
      )}
    </div>
  );
}

export function ExerciseView({ exercise, onChecked }: Props) {
  const ctx = useContext(RubyContext);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // A ref, not only state: a double tap submits twice before the next render.
  const answered = useRef(false);
  const submit = (answer: Answer) => {
    if (answered.current) return;
    answered.current = true;
    const o = check(exercise, answer, { ruby: ctx.ruby });
    setOutcome(o);
    onChecked(o);
  };
  const locked = outcome !== null;

  return (
    <div class="exercise" data-type={exercise.type}>
      {exercise.type === 'choice' && <ChoiceBody ex={exercise} locked={locked} onAnswer={submit} />}
      {exercise.type === 'fill' && <FillBody ex={exercise} locked={locked} onAnswer={submit} />}
      {exercise.type === 'order' && <OrderBody ex={exercise} locked={locked} onAnswer={submit} />}
      {exercise.type === 'match' && <MatchBody ex={exercise} locked={locked} onAnswer={submit} />}
      {(exercise.type === 'translate' || exercise.type === 'question') && <TextBody ex={exercise} locked={locked} onAnswer={submit} />}
      {outcome && <Feedback outcome={outcome} exercise={exercise} />}
    </div>
  );
}

type Body<E> = { ex: E; locked: boolean; onAnswer: (a: Answer) => void };

function ChoiceBody({ ex, locked, onAnswer }: Body<Extract<AnyExercise, { type: 'choice' }>>) {
  const [picked, setPicked] = useState<number | null>(null);
  const listen = 'listen' in ex ? ex.listen : undefined;
  return (
    <>
      <p class="ex-prompt">
        <MixedText text={ex.promptVi} />
      </p>
      {listen &&
        (voices.value.length > 0 ? (
          <button type="button" class="button" onClick={() => speak(listen, { rate: settings.value.speechRate, voiceURI: settings.value.voiceURI })}>
            {T.exercise.listen}
          </button>
        ) : (
          <p class="muted">{T.exercise.noVoice}</p>
        ))}
      {ex.ja && !listen && <JaText text={ex.ja} class="ex-ja" />}
      <div class="options" role="radiogroup">
        {ex.options.map((o, i) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={picked === i}
            disabled={locked}
            class={`option${picked === i ? ' picked' : ''}${locked && i === ex.answer ? ' right' : ''}${locked && picked === i && i !== ex.answer ? ' wrong' : ''}`}
            onClick={() => {
              setPicked(i);
              onAnswer({ type: 'choice', index: i });
            }}
          >
            <MixedText text={o} />
          </button>
        ))}
      </div>
    </>
  );
}

function FillBody({ ex, locked, onAnswer }: Body<Extract<AnyExercise, { type: 'fill' }>>) {
  const { ruby } = useContext(RubyContext);
  const [text, setText] = useState('');
  const accepted = ex.answers.flatMap((a) => acceptedForms(a, { ruby }));
  return (
    <>
      <p class="ex-prompt">{ex.promptVi ?? T.exercise.fill}</p>
      {ex.vi && <p class="muted">{ex.vi}</p>}
      <p class="ex-ja fill-line" lang="ja">
        {ex.before}
        <span class="blank">{text || '＿＿'}</span>
        {ex.after}
      </p>
      {ex.options ? (
        <div class="options inline">
          {ex.options.map((o) => (
            <button key={o} type="button" class="option" disabled={locked} lang="ja" onClick={() => (setText(o), onAnswer({ type: 'fill', text: o }))}>
              {o}
            </button>
          ))}
        </div>
      ) : (
        <TextAnswer locked={locked} value={text} accepted={accepted} onInput={setText} onSubmit={() => onAnswer({ type: 'fill', text })} />
      )}
    </>
  );
}

function OrderBody({ ex, locked, onAnswer }: Body<Extract<AnyExercise, { type: 'order' }>>) {
  const pool = useMemo(() => shuffledTiles(ex), [ex.id]);
  const [chosen, setChosen] = useState<number[]>([]);
  const left = pool.map((t, i) => ({ t, i })).filter(({ i }) => !chosen.includes(i));
  return (
    <>
      <p class="ex-prompt">{ex.vi}</p>
      <p class="muted">{T.exercise.tapTiles}</p>
      <div class="order-line" lang="ja" aria-label={T.exercise.yourOrder}>
        {chosen.map((i) => (
          <button key={i} type="button" class="tile placed" disabled={locked} onClick={() => setChosen(chosen.filter((x) => x !== i))}>
            {pool[i]}
          </button>
        ))}
      </div>
      <div class="tile-pool" lang="ja">
        {left.map(({ t, i }) => (
          <button key={i} type="button" class="tile" disabled={locked} onClick={() => setChosen([...chosen, i])}>
            {t}
          </button>
        ))}
      </div>
      {!locked && (
        <div class="button-row">
          <button type="button" class="button" onClick={() => setChosen([])} disabled={chosen.length === 0}>
            {T.exercise.clear}
          </button>
          <button type="button" class="button primary" disabled={left.length > 0} onClick={() => onAnswer({ type: 'order', tiles: chosen.map((i) => pool[i]!) })}>
            {T.exercise.check}
          </button>
        </div>
      )}
    </>
  );
}

function TextBody({ ex, locked, onAnswer }: Body<Extract<AnyExercise, { type: 'translate' | 'question' }>>) {
  const { ruby } = useContext(RubyContext);
  const [text, setText] = useState('');
  const q = ex.type === 'question' ? ex.question : null;
  return (
    <>
      {ex.type === 'translate' ? (
        <>
          <p class="ex-prompt">{T.exercise.translate}</p>
          <p class="ex-vi">{ex.vi}</p>
        </>
      ) : (
        <>
          {q?.picture && (
            <div class="picture" aria-hidden="true">
              {q.picture}
            </div>
          )}
          <div class="ex-ja-row">
            <JaText text={q!.prompt} class="ex-ja" />
            <SpeakButton text={readingOf(q!.prompt, ruby)} label={T.speak(q!.prompt)} />
          </div>
          {q?.promptVi && <p class="muted">{q.promptVi}</p>}
        </>
      )}
      <TextAnswer locked={locked} value={text} accepted={[]} onInput={setText} onSubmit={() => onAnswer({ type: 'text', text })} />
    </>
  );
}

/** Typed answer. Latin letters where Japanese is expected are not graded: the learner is asked to switch keyboards. */
function TextAnswer({
  locked,
  value,
  accepted,
  onInput,
  onSubmit,
}: {
  locked: boolean;
  value: string;
  accepted: readonly string[];
  onInput: (v: string) => void;
  onSubmit: () => void;
}) {
  const [keyboardHint, setKeyboardHint] = useState(false);
  return (
    <form
      class="answer-form"
      autocomplete="off"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        if (needsJapaneseKeyboard(value, accepted)) {
          setKeyboardHint(true);
          return;
        }
        onSubmit();
      }}
    >
      <label class="visually-hidden" for="ex-answer">
        {T.exercise.typeHere}
      </label>
      <input
        id="ex-answer"
        type="text"
        lang="ja"
        value={value}
        disabled={locked}
        placeholder={T.exercise.typeHere}
        onInput={(e) => {
          setKeyboardHint(false);
          onInput((e.target as HTMLInputElement).value);
        }}
      />
      {!locked && (
        <button type="submit" class="button primary" disabled={!value.trim()}>
          {T.exercise.check}
        </button>
      )}
      {keyboardHint && (
        <p class="notice error" role="alert">
          {T.exercise.latinTyped} <a href={href('/guide')}>{T.exercise.imeGuide}</a>
        </p>
      )}
      {!locked && !keyboardHint && (
        <p class="muted ime-hint">
          {T.exercise.imeHint} <a href={href('/guide')}>{T.exercise.imeGuide}</a>
        </p>
      )}
    </form>
  );
}

function MatchBody({ ex, locked, onAnswer }: Body<Extract<AnyExercise, { type: 'match' }>>) {
  const right = useMemo(() => shuffle(ex.pairs.map((p) => p[1]), `${ex.id}#right`), [ex.id]);
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const pick = (value: string) => {
    if (selected === null || locked) return;
    if (ex.pairs[selected]![1] === value) {
      const next = new Set(matched).add(selected);
      setMatched(next);
      setSelected(null);
      if (next.size === ex.pairs.length) onAnswer({ type: 'match', mistakes });
    } else {
      setMistakes((m) => m + 1);
      setFlash(value);
      setTimeout(() => setFlash(null), 600);
    }
  };
  return (
    <>
      <p class="ex-prompt">
        <MixedText text={ex.promptVi} />
      </p>
      <p class="muted">{T.exercise.matchHint}</p>
      <div class="match-grid">
        <div class="match-col">
          {ex.pairs.map((p, i) => (
            <button
              key={p[0]}
              type="button"
              class={`option${selected === i ? ' picked' : ''}${matched.has(i) ? ' right' : ''}`}
              aria-pressed={selected === i}
              disabled={matched.has(i) || locked}
              onClick={() => setSelected(i)}
            >
              <MixedText text={p[0]} />
            </button>
          ))}
        </div>
        <div class="match-col">
          {right.map((value) => {
            const done = [...matched].some((i) => ex.pairs[i]![1] === value);
            return (
              <button key={value} type="button" class={`option${done ? ' right' : ''}${flash === value ? ' wrong' : ''}`} disabled={done || locked} onClick={() => pick(value)}>
                <MixedText text={value} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
