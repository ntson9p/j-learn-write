import { LEVELS, type Exercise, type KanaEntry, type LevelId, type ListWord, type WordContent } from '@j-learn-write/course';
import { useState } from 'preact/hooks';
import type { AnyExercise } from '../components/exercise';
import { useAsync } from '../components/hooks';
import type { PageProps } from '../components/lazy';
import { ExerciseRun, type Answered } from '../components/run';
import { MixedText, RubyContext } from '../components/text';
import { kanaList, lessonsOf, listWords } from '../lib/content';
import { kanaDrills, shuffle, wordDrills } from '../lib/exercises';
import { addResult, averageScore, resultsFor, weakGrammar } from '../lib/results';
import { voices } from '../lib/speech';
import { href } from '../router';
import { T } from '../strings';

export const LEVEL_TEST_SIZE = 25;

interface WrittenLesson {
  id: string;
  exercises: readonly Exercise[];
  words: readonly WordContent[];
  kana: readonly string[];
}

/**
 * A level test: generated drills (kana of the kana stage, words of N5/N4) and
 * authored exercises of every written lesson (no matching), with a seed per
 * attempt.
 */
export function levelTestItems(
  level: LevelId,
  lessons: readonly WrittenLesson[],
  kana: readonly KanaEntry[],
  listed: ReadonlyMap<number, ListWord>,
  attempt: number,
  listening: boolean,
): AnyExercise[] {
  const seed = `${level}-test-${attempt}`;
  const byChar = new Map(kana.map((k) => [k.kana, k]));
  const taught = lessons.flatMap((l) => l.kana).flatMap((c) => byChar.get(c) ?? []);
  const drills =
    level === 'kana'
      ? kanaDrills(seed, taught, taught, { count: 10, listening })
      : wordDrills(seed, lessons.flatMap((l) => l.words), listed, { count: 8, listening });
  const authored = shuffle(
    lessons.flatMap((l) => l.exercises.filter((e) => e.type !== 'match')),
    `${seed}#authored`,
  ).slice(0, LEVEL_TEST_SIZE - drills.length);
  return shuffle([...drills, ...authored], `${seed}#mix`);
}

export default function LevelTestPage({ params }: PageProps) {
  const level = params.level as LevelId;
  const data = useAsync(async () => {
    if (!LEVELS.includes(level)) return null;
    const lessons = await lessonsOf(level);
    const past = await resultsFor('level', { level });
    return { lessons, kana: await kanaList(), listed: await listWords(), attempt: past.length };
  }, [level]);
  const [started, setStarted] = useState(0);
  const [score, setScore] = useState<{ value: number; weak: string[] } | null>(null);

  if (data.loading) return <p class="loading">{T.loading}</p>;
  const d = data.data;
  if (!d) return <p class="card">{T.notFound}</p>;
  const written = d.lessons
    .filter((l) => l.content)
    .map((l) => ({ id: l.meta.id, exercises: l.content!.exercises, words: l.content!.words ?? [], kana: l.meta.kana ?? [] }));
  const grammarTitle = new Map(d.lessons.flatMap((l) => l.content?.grammar ?? []).map((g) => [g.id, g.titleVi]));
  // Furigana of every written lesson of the level (exercise texts are keyed by their text).
  const ruby = Object.assign({}, ...d.lessons.map((l) => l.content?.ruby ?? {})) as Record<string, string>;
  const items = written.length > 0 ? levelTestItems(level, written, d.kana, d.listed, d.attempt, voices.value.length > 0) : [];

  const finish = async (answers: Answered[]) => {
    const value = averageScore(answers.map((a) => a.outcome.score));
    const weak = weakGrammar(answers.map((a) => ({ correct: a.outcome.correct, grammar: 'grammar' in a.exercise ? a.exercise.grammar : undefined })));
    await addResult({ kind: 'level', level, score: value, at: Date.now(), durationMs: Date.now() - started, weakGrammar: weak });
    setScore({ value, weak });
  };

  return (
    <section class="page level-test-page">
      <h1>{T.levelTest.title(T.levelName(level))}</h1>
      {written.length === 0 ? (
        <p class="card">{T.levelTest.none}</p>
      ) : score ? (
        <div class="card" data-testid="level-result">
          <p class="score-line">{T.levelTest.result(score.value)}</p>
          <p>{score.value >= 90 ? T.levelTest.good : score.value >= 60 ? T.levelTest.fair : T.levelTest.poor}</p>
          {score.weak.length > 0 && (
            <ul class="link-list">
              {score.weak.map((id) => (
                <li key={id}>
                  <a href={href(`/grammar/${id}`)}>
                    <MixedText text={grammarTitle.get(id) ?? id} />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a class="button" href={href('/progress')}>
            {T.progress.title}
          </a>
        </div>
      ) : !started ? (
        <div class="card">
          <p>{T.levelTest.intro(items.length, written.length)}</p>
          {written.length < d.lessons.length && <p class="muted">{T.levelTest.partial}</p>}
          <button type="button" class="button primary" onClick={() => setStarted(Date.now())}>
            {T.levelTest.start}
          </button>
        </div>
      ) : (
        <RubyContext.Provider value={{ ruby }}>
          <ExerciseRun exercises={items} onFinish={(a) => void finish(a)} />
        </RubyContext.Provider>
      )}
    </section>
  );
}
