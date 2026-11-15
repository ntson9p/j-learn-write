/** Learning statistics for the progress page (pure functions + loaders). */
import { db, type StoredCard, type TestResult } from './db';
import { isMature, isNewCard } from './srs';

const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/**
 * Consecutive days with some study, counting back from today (or from
 * yesterday when nothing was done yet today).
 */
export function streakDays(activity: readonly number[], now: Date): number {
  const days = new Set(activity.map(dayKey));
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export interface CardStats {
  total: number;
  learning: number;
  mature: number;
  dueNow: number;
  fresh: number;
}

export function cardStats(cards: readonly StoredCard[], now: Date): CardStats {
  const t = now.getTime();
  return {
    total: cards.length,
    fresh: cards.filter(isNewCard).length,
    mature: cards.filter(isMature).length,
    learning: cards.filter((c) => !isNewCard(c) && !isMature(c)).length,
    dueNow: cards.filter((c) => !isNewCard(c) && c.due <= t).length,
  };
}

/** Grammar points missed in the most recent results, most frequent first. */
export function recentWeakGrammar(results: readonly TestResult[], last = 10): string[] {
  const count = new Map<string, number>();
  for (const r of [...results].sort((a, b) => b.at - a.at).slice(0, last)) {
    for (const g of r.weakGrammar) count.set(g, (count.get(g) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([g]) => g);
}

export async function loadStats(now: Date) {
  const database = await db();
  const [cards, logs, results, lessons] = await Promise.all([
    database.getAll('cards'),
    database.getAll('reviewLogs'),
    database.getAll('results'),
    database.getAll('lessons'),
  ]);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return {
    cards: cardStats(cards, now),
    reviewsToday: logs.filter((l) => l.time >= startToday).length,
    streak: streakDays([...logs.map((l) => l.time), ...results.map((r) => r.at)], now),
    completed: lessons.filter((l) => l.completedAt !== null).map((l) => l.lessonId),
    results: [...results].sort((a, b) => b.at - a.at),
    weak: recentWeakGrammar(results),
  };
}
