/**
 * Spaced repetition with FSRS (ts-fsrs). Cards are stored as plain records
 * (dates in epoch ms); fuzzing is off, so a review always gives the same
 * schedule for the same history.
 */
import { createEmptyCard, fsrs, State, type Card, type Grade } from 'ts-fsrs';
import type { StoredCard, StoredReviewLog } from './db';

export type Rating = 1 | 2 | 3 | 4;
export const RATINGS: readonly Rating[] = [1, 2, 3, 4];

const scheduler = fsrs({ enable_fuzz: false, request_retention: 0.9, maximum_interval: 3650 });

export function newStoredCard(wordId: string, now: Date): StoredCard {
  return fromCard(wordId, createEmptyCard(now), now.getTime());
}

export function toCard(s: StoredCard): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state as State,
    ...(s.lastReview !== null ? { last_review: new Date(s.lastReview) } : {}),
  } as Card;
}

export function fromCard(wordId: string, c: Card, addedAt: number): StoredCard {
  return {
    wordId,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review ? c.last_review.getTime() : null,
    addedAt,
  };
}

/** Applies one answer. */
export function reviewCard(stored: StoredCard, rating: Rating, now: Date): { card: StoredCard; log: StoredReviewLog } {
  const { card, log } = scheduler.next(toCard(stored), now, rating as Grade);
  return {
    card: fromCard(stored.wordId, card, stored.addedAt),
    log: {
      wordId: stored.wordId,
      time: now.getTime(),
      rating,
      state: stored.state,
      scheduledDays: card.scheduled_days,
      stability: card.stability,
      difficulty: card.difficulty,
    },
  };
}

/** When each rating would bring the card back (for the buttons' hints). */
export function previewIntervals(stored: StoredCard, now: Date): Record<Rating, number> {
  const out = {} as Record<Rating, number>;
  for (const r of RATINGS) out[r] = reviewCard(stored, r, now).card.due - now.getTime();
  return out;
}

/** "1 phút", "10 phút", "3 ngày", "2 tháng"… */
export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} phút`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ngày`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} tháng`;
  return `${Math.round(days / 365)} năm`;
}

export const isNewCard = (c: StoredCard) => c.state === State.New;
/** Learned well enough to count as "đã nhớ": in review state with at least a week of stability. */
export const isMature = (c: StoredCard) => c.state === State.Review && c.stability >= 7;
