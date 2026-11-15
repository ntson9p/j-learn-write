/**
 * Renders every exercise of the written lessons (and the drills generated for
 * them), answers it wrongly to show the feedback, and checks that all
 * Japanese text carries lang="ja".
 */
import { LEVELS, loadKana, loadLevel } from '@j-learn-write/course';
import { cleanup, fireEvent, render } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { ExerciseView, type AnyExercise } from '../src/components/exercise';
import { RubyContext } from '../src/components/text';
import { lessonDrills } from '../src/pages/practice';
import { untaggedJapanese } from './untagged';

afterEach(cleanup);

describe('exercises on screen', async () => {
  const kana = await loadKana();
  const lessons = (await Promise.all(LEVELS.map(loadLevel))).flat().filter((l) => l.content);
  const taught: string[] = [];

  for (const lesson of lessons) {
    taught.push(...(lesson.meta.kana ?? []));
    const exercises: AnyExercise[] = [...lessonDrills(lesson, kana, [...taught], true), ...lesson.content!.exercises];
    it(`${lesson.meta.id}: ${exercises.length} exercises tag their Japanese text`, () => {
      for (const ex of exercises) {
        const { container, unmount } = render(
          <RubyContext.Provider value={{ ruby: lesson.content!.ruby ?? {}, learned: new Set() }}>
            <ExerciseView exercise={ex} onChecked={() => {}} />
          </RubyContext.Provider>,
        );
        expect(untaggedJapanese(container), ex.id).toEqual([]);
        if (ex.type === 'choice') {
          const wrong = container.querySelectorAll<HTMLButtonElement>('.option')[ex.answer === 0 ? 1 : 0]!;
          fireEvent.click(wrong);
          expect(container.querySelector('.feedback.bad'), ex.id).not.toBeNull();
          expect(untaggedJapanese(container), `${ex.id} feedback`).toEqual([]);
        }
        unmount();
      }
    });
  }
});
