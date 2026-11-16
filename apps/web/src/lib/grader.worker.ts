/**
 * Grades free answers off the main thread: building the grader's word list
 * and rule tables takes about half a second on a laptop and more on a phone,
 * and must not freeze the screen.
 */
import * as grader from '@j-learn-write/grader';
import { checkJaSentence, grade, graderLexicon } from '@j-learn-write/grader';
import { kanjiWords, type GradingRequest, type GradingResponse } from './grading';

const reply = (message: GradingResponse) => (globalThis as unknown as { postMessage(m: GradingResponse): void }).postMessage(message);

addEventListener('message', (event: Event) => {
  const request = (event as MessageEvent<GradingRequest>).data;
  try {
    if (request.kind === 'grade') reply({ id: request.id, result: grade(request.question, request.answer) });
    else if (request.kind === 'sentence') reply({ id: request.id, result: checkJaSentence(request.text) });
    else if (request.kind === 'words') reply({ id: request.id, result: kanjiWords(grader, request.text) });
    else {
      graderLexicon();
      checkJaSentence('私は学生です。');
      reply({ id: request.id, result: null });
    }
  } catch (error) {
    reply({ id: request.id, error: String(error) });
  }
});
