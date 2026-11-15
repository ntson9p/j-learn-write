import type { Issue, Severity } from './core/types';

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'mark'; text: string; severity: Severity; messages: string[] }
  /** Something is missing at this position. */
  | { kind: 'insert'; messages: string[] };

/**
 * Cuts the normalized answer into plain and marked segments for display.
 * Info issues and issues without a position are not drawn.
 */
export function segments(text: string, issues: readonly Issue[]): Segment[] {
  const marks = issues.filter(
    (i) => i.severity !== 'info' && i.start >= 0 && i.end <= text.length && (i.start < i.end || i.fix !== undefined),
  );
  const cuts = new Set([0, text.length]);
  for (const m of marks) {
    cuts.add(m.start);
    cuts.add(m.end);
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  points.forEach((pos, k) => {
    const inserts = marks.filter((m) => m.start === pos && m.end === pos);
    if (inserts.length > 0) out.push({ kind: 'insert', messages: inserts.map((m) => m.message) });
    const next = points[k + 1];
    if (next === undefined || next === pos) return;
    const piece = text.slice(pos, next);
    const covering = marks.filter((m) => m.start <= pos && m.end >= next && m.start < m.end);
    if (covering.length === 0) out.push({ kind: 'text', text: piece });
    else {
      const severity = covering.some((m) => m.severity === 'error') ? 'error' : 'typo';
      out.push({ kind: 'mark', text: piece, severity, messages: covering.map((m) => m.message) });
    }
  });
  return out;
}
