import { describe, expect, it } from 'vitest';
import { formatInterval, isMature, isNewCard, newStoredCard, previewIntervals, reviewCard } from '../src/lib/srs';

const t0 = new Date('2026-11-15T08:00:00Z');
const MIN = 60_000;
const DAY = 86_400_000;

describe('srs (FSRS)', () => {
  it('starts with a new card due now', () => {
    const c = newStoredCard('w0001', t0);
    expect(c).toMatchObject({ wordId: 'w0001', due: t0.getTime(), state: 0, reps: 0, lastReview: null, addedAt: t0.getTime() });
    expect(isNewCard(c)).toBe(true);
  });

  it('schedules learning steps, then days, the same way every time', () => {
    let c = newStoredCard('w0001', t0);
    const first = reviewCard(c, 3, t0);
    expect(first.card.due - t0.getTime()).toBe(10 * MIN);
    expect(first.log).toMatchObject({ wordId: 'w0001', rating: 3, state: 0, time: t0.getTime() });
    c = first.card;
    const second = reviewCard(c, 3, new Date(c.due));
    expect(second.card.state).toBe(2);
    expect(Math.round((second.card.due - c.due) / DAY)).toBeGreaterThanOrEqual(1);
    // Determinism: same inputs, same output.
    expect(reviewCard(c, 3, new Date(c.due))).toEqual(second);
  });

  it('gives shorter intervals for harder answers and resets on "again"', () => {
    let c = newStoredCard('w0002', t0);
    for (let i = 0; i < 4; i++) c = reviewCard(c, 3, new Date(c.due)).card;
    const p = previewIntervals(c, new Date(c.due));
    expect(p[1]).toBeLessThan(p[2]);
    expect(p[2]).toBeLessThan(p[3]);
    expect(p[3]).toBeLessThan(p[4]);
    const lapse = reviewCard(c, 1, new Date(c.due)).card;
    expect(lapse.lapses).toBe(1);
    expect(lapse.state).toBe(3);
  });

  it('reaches "mature" after successful reviews', () => {
    let c = newStoredCard('w0003', t0);
    for (let i = 0; i < 6; i++) c = reviewCard(c, 3, new Date(c.due)).card;
    expect(isMature(c)).toBe(true);
  });

  it('formats intervals in Vietnamese', () => {
    expect(formatInterval(10 * MIN)).toBe('10 phút');
    expect(formatInterval(5 * 3_600_000)).toBe('5 giờ');
    expect(formatInterval(3 * DAY)).toBe('3 ngày');
    expect(formatInterval(65 * DAY)).toBe('2 tháng');
    expect(formatInterval(800 * DAY)).toBe('2 năm');
  });
});
