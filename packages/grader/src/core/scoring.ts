import type { Issue } from './types';

/** Rounds and clamps a score to 0-100. */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function totalPenalty(issues: readonly Issue[]): number {
  return issues.reduce((sum, issue) => sum + issue.penalty, 0);
}

/** Merges default penalties with per-question overrides. */
export function resolvePenalties(
  defaults: Readonly<Record<string, number>>,
  overrides?: Readonly<Record<string, number>>,
): Record<string, number> {
  return { ...defaults, ...(overrides ?? {}) };
}

/** Sorts issues by position, then by code, and removes exact duplicates. */
export function sortIssues(issues: readonly Issue[]): Issue[] {
  const seen = new Set<string>();
  const out: Issue[] = [];
  for (const issue of issues) {
    const key = `${issue.code}:${issue.start}:${issue.end}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(issue);
    }
  }
  return out.sort((a, b) => a.start - b.start || a.end - b.end || a.code.localeCompare(b.code));
}
