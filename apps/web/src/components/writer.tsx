/** Stroke-order animation and handwriting quiz (hanzi-writer, loaded on demand). */
import type { CharacterJson } from 'hanzi-writer';
import { useEffect, useRef, useState } from 'preact/hooks';
import { strokeUrl } from '../lib/writing';
import { T } from '../strings';

type Writer = {
  animateCharacter: () => void;
  quiz: (opts: { onComplete: (s: { totalMistakes: number }) => void }) => void;
  showOutline: () => void;
  hideOutline: () => void;
  cancelQuiz: () => void;
};

export function CharacterWriter({ char, onQuizDone }: { char: string; onQuizDone?: (mistakes: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const writer = useRef<Writer | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed' | 'quiz' | 'done'>('loading');
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    let alive = true;
    setState('loading');
    void import('hanzi-writer').then(({ default: HanziWriter }) => {
      if (!alive || !box.current) return;
      box.current.replaceChildren();
      writer.current = HanziWriter.create(box.current, char, {
        width: 240,
        height: 240,
        padding: 10,
        showOutline: true,
        strokeColor: '#b3261e',
        radicalColor: '#1a5fb4',
        delayBetweenStrokes: 250,
        charDataLoader: (c: string, onLoad: (data: CharacterJson) => void, onError: (err?: unknown) => void) => {
          fetch(strokeUrl(c))
            .then((r) => (r.ok ? (r.json() as Promise<CharacterJson>) : Promise.reject(new Error(String(r.status)))))
            .then(onLoad, onError);
        },
        onLoadCharDataSuccess: () => alive && setState('ready'),
        onLoadCharDataError: () => alive && setState('failed'),
      }) as unknown as Writer;
    }, () => alive && setState('failed'));
    return () => {
      alive = false;
      writer.current?.cancelQuiz?.();
    };
  }, [char]);

  return (
    <div class="writer">
      <div class="writer-box" ref={box} aria-label={char} role="img" lang="ja" />
      {state === 'failed' && <p class="notice error">{T.writing.loadFailed}</p>}
      {state === 'quiz' && <p class="muted">{T.writing.quizHint}</p>}
      {state === 'done' && <p class="notice ok">{T.writing.done(mistakes)}</p>}
      <div class="button-row">
        <button type="button" class="button" disabled={state === 'loading' || state === 'failed'} onClick={() => writer.current?.animateCharacter()}>
          {T.writing.animate}
        </button>
        <button
          type="button"
          class="button primary"
          disabled={state === 'loading' || state === 'failed'}
          onClick={() => {
            setState('quiz');
            writer.current?.quiz({
              onComplete: ({ totalMistakes }) => {
                setMistakes(totalMistakes);
                setState('done');
                onQuizDone?.(totalMistakes);
              },
            });
          }}
        >
          {T.writing.quiz}
        </button>
      </div>
    </div>
  );
}
