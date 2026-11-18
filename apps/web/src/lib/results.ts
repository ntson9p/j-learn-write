/** Lesson-quiz and level-test results. */
import type { LevelId } from '@j-learn-write/course';
import { db, type TestResult } from './db';

export async function addResult(r: Omit<TestResult, 'id'>): Promise<number> {
  return (await db()).add('results', r as TestResult);
}

export async function allResults(): Promise<TestResult[]> {
  return (await db()).getAll('results');
}

export async function resultsFor(kind: TestResult['kind'], key: { level: LevelId; lessonId?: string }): Promise<TestResult[]> {
  const list = await (await db()).getAllFromIndex('results', 'level', key.level);
  return list.filter((r) => r.kind === kind && (key.lessonId === undefined || r.lessonId === key.lessonId)).sort((a, b) => a.at - b.at);
}

/** Average score of answered items, rounded (0 when empty). */
export function averageScore(scores: readonly number[]): number {
  return scores.length === 0 ? 0 : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Grammar points with at least one wrong answer, most frequent first. */
export function weakGrammar(items: readonly { grammar?: string[]; correct: boolean }[]): string[] {
  const count = new Map<string, number>();
  for (const it of items) if (!it.correct) for (const g of it.grammar ?? []) count.set(g, (count.get(g) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([g]) => g);
}
