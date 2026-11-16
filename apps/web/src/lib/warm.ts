/**
 * The grader builds its word list (every form of every course word) and its
 * rule tables on first use: about half a second on a laptop, more on a phone.
 * Pages with free answers build them while the learner reads the first
 * question, so that checking the first answer does not freeze the screen.
 */
import { checkJaSentence, graderLexicon } from '@j-learn-write/grader';

let warmed = false;

export function warmGrader(): void {
  if (warmed) return;
  warmed = true;
  const run = () => {
    graderLexicon();
    checkJaSentence('私は学生です。');
  };
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(run, { timeout: 3000 });
  else setTimeout(run, 300);
}
