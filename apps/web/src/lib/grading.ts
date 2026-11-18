/**
 * Free-answer grading for the app, in a Web Worker (lib/grader.worker.ts) so
 * that the grader's first use does not block the page. Without workers (unit
 * tests, a browser that refuses the worker) the grader runs on the page.
 */
import type { GradeResult, Question, SentenceCheck } from '@j-learn-write/grader';

export type GradingRequest =
  | { id: number; kind: 'grade'; question: Question; answer: string }
  | { id: number; kind: 'sentence'; text: string }
  | { id: number; kind: 'words'; text: string }
  | { id: number; kind: 'warm' };

export type GradingResponse = { id: number; result: GradeResult | SentenceCheck | number[][] | null } | { id: number; error: string };

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  if (import.meta.env.MODE === 'test' || typeof Worker === 'undefined') return worker;
  try {
    const w = new Worker(new URL('./grader.worker.ts', import.meta.url), { type: 'module' });
    w.addEventListener('message', (event: MessageEvent<GradingResponse>) => {
      const p = pending.get(event.data.id);
      if (!p) return;
      pending.delete(event.data.id);
      if ('error' in event.data) p.reject(new Error(event.data.error));
      else p.resolve(event.data.result);
    });
    // A worker that cannot start: grade on the page from now on.
    w.addEventListener('error', () => {
      worker = null;
      for (const p of pending.values()) p.reject(new Error('worker failed'));
      pending.clear();
    });
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

type Payload = { kind: 'grade'; question: Question; answer: string } | { kind: 'sentence'; text: string } | { kind: 'words'; text: string } | { kind: 'warm' };

/** Course word numbers of each token written with kanji (every analysis, usual first). */
export function kanjiWords(g: typeof import('@j-learn-write/grader'), text: string): number[][] {
  return g
    .tokenize(g.normalizeJa(text).text, g.graderLexicon())
    .filter((t) => [...t.surface].some(g.isKanji))
    .map((t) => t.analyses.flatMap((a) => (a.kind === 'word' ? [a.no] : [])));
}

async function inline(payload: Payload): Promise<unknown> {
  const g = await import('@j-learn-write/grader');
  if (payload.kind === 'grade') return g.grade(payload.question, payload.answer);
  if (payload.kind === 'sentence') return g.checkJaSentence(payload.text);
  if (payload.kind === 'words') return kanjiWords(g, payload.text);
  g.graderLexicon();
  g.checkJaSentence('私は学生です。');
  return null;
}

async function call(payload: Payload): Promise<unknown> {
  const w = getWorker();
  if (!w) return inline(payload);
  const id = nextId++;
  try {
    return await new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      w.postMessage({ id, ...payload } as GradingRequest);
    });
  } catch {
    return inline(payload);
  }
}

/** Grades a free answer. */
export const gradeAnswer = (question: Question, answer: string) => call({ kind: 'grade', question, answer }) as Promise<GradeResult>;

/** Course words written with kanji in a text, for the Hán Việt line under example sentences. */
export const wordsWithKanji = (text: string) => call({ kind: 'words', text }) as Promise<number[][]>;

/** Runs the grammar rules on one sentence. */
export const checkSentence = (text: string) => call({ kind: 'sentence', text }) as Promise<SentenceCheck>;

let warmed = false;

/** Builds the grader's tables ahead of the first answer (in the worker, or on the page when idle). */
export function warmGrader(): void {
  if (warmed) return;
  warmed = true;
  if (getWorker()) {
    void call({ kind: 'warm' });
    return;
  }
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  const run = () => void inline({ kind: 'warm' });
  if (idle) idle(run, { timeout: 3000 });
  else setTimeout(run, 300);
}
