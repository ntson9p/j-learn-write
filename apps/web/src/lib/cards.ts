/**
 * Review cards in IndexedDB and the queue of a review session.
 * A card is created when the learner studies a lesson's words; new cards
 * enter review sessions at most `newWordsPerDay` per day.
 */
import { db, type StoredCard } from './db';
import { isNewCard, newStoredCard, reviewCard, type Rating } from './srs';

/** Creates cards for words that have none; returns how many were added. */
export async function addCards(wordIds: readonly string[], now: Date): Promise<number> {
  const database = await db();
  const tx = database.transaction('cards', 'readwrite');
  let added = 0;
  // Keep the course order: every new card gets a later addedAt than all existing ones.
  let next = now.getTime();
  for (const c of await tx.store.getAll()) next = Math.max(next, c.addedAt + 1);
  for (const id of wordIds) {
    if (await tx.store.get(id)) continue;
    const card = newStoredCard(id, now);
    card.addedAt = next++;
    await tx.store.put(card);
    added++;
  }
  await tx.done;
  return added;
}

export async function getCard(wordId: string): Promise<StoredCard | undefined> {
  return (await db()).get('cards', wordId);
}

export async function allCards(): Promise<StoredCard[]> {
  return (await db()).getAll('cards');
}

/** Saves the answer of one review (card + log) atomically. */
export async function answerCard(card: StoredCard, rating: Rating, now: Date): Promise<StoredCard> {
  const { card: next, log } = reviewCard(card, rating, now);
  const database = await db();
  const tx = database.transaction(['cards', 'reviewLogs'], 'readwrite');
  await Promise.all([tx.objectStore('cards').put(next), tx.objectStore('reviewLogs').add(log), tx.done]);
  return next;
}

const startOfDay = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

/** New cards already introduced today (first reviews logged since midnight). */
export async function newIntroducedToday(now: Date): Promise<number> {
  const logs = await (await db()).getAllFromIndex('reviewLogs', 'time', IDBKeyRange.lowerBound(startOfDay(now)));
  return logs.filter((l) => l.state === 0).length;
}

export interface SessionPlan {
  /** Cards to review now, due ones first, then today's new ones. */
  queue: StoredCard[];
  due: number;
  fresh: number;
}

/** Pure planning of a session (tested without IndexedDB). */
export function planSession(cards: readonly StoredCard[], now: Date, newLeft: number): SessionPlan {
  const t = now.getTime();
  const due = cards.filter((c) => !isNewCard(c) && c.due <= t).sort((a, b) => a.due - b.due || a.addedAt - b.addedAt);
  const fresh = cards
    .filter(isNewCard)
    .sort((a, b) => a.addedAt - b.addedAt)
    .slice(0, Math.max(0, newLeft));
  return { queue: [...due, ...fresh], due: due.length, fresh: fresh.length };
}

export async function sessionFor(now: Date, newWordsPerDay: number): Promise<SessionPlan> {
  const left = newWordsPerDay - (await newIntroducedToday(now));
  return planSession(await allCards(), now, left);
}

/** Within a session, a card due again soon (learning steps) comes back later in the queue. */
export const SAME_SESSION_MS = 20 * 60_000;
