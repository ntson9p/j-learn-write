import { describe, expect, it } from 'vitest';
import type { TestResult } from '../src/lib/db';
import { newStoredCard } from '../src/lib/srs';
import { cardStats, recentWeakGrammar, streakDays } from '../src/lib/stats';

const day = (d: number, h = 10) => new Date(2026, 10, d, h).getTime();

describe('stats', () => {
  it('counts consecutive study days', () => {
    const now = new Date(2026, 10, 15, 20);
    expect(streakDays([day(15), day(14), day(13, 23), day(11)], now)).toBe(3);
    expect(streakDays([day(14), day(13)], now)).toBe(2); // nothing yet today
    expect(streakDays([day(12)], now)).toBe(0);
    expect(streakDays([], now)).toBe(0);
  });

  it('summarizes cards', () => {
    const now = new Date(2026, 10, 15, 12);
    const fresh = newStoredCard('w1', now);
    const due = { ...newStoredCard('w2', now), state: 2, stability: 3, due: now.getTime() - 1 };
    const mature = { ...newStoredCard('w3', now), state: 2, stability: 20, due: now.getTime() + 1e9 };
    expect(cardStats([fresh, due, mature], now)).toEqual({ total: 3, fresh: 1, learning: 1, mature: 1, dueNow: 1 });
  });

  it('ranks recently missed grammar points', () => {
    const r = (at: number, weak: string[]): TestResult => ({ kind: 'lesson', level: 'n5', score: 50, at, durationMs: 0, weakGrammar: weak });
    expect(recentWeakGrammar([r(1, ['wo']), r(2, ['ga-subject', 'wo']), r(3, ['de-place'])])).toEqual(['wo', 'de-place', 'ga-subject']);
  });
});
