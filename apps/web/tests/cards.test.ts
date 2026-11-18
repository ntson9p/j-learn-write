import { beforeEach, describe, expect, it } from 'vitest';
import { addCards, allCards, answerCard, getCard, newIntroducedToday, planSession, sessionFor } from '../src/lib/cards';
import { clearAll } from '../src/lib/db';
import { newStoredCard } from '../src/lib/srs';

const t0 = new Date(2026, 10, 15, 8, 0, 0);

describe('cards', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('adds each word once, in course order', async () => {
    expect(await addCards(['w0003', 'w0001', 'w0002'], t0)).toBe(3);
    expect(await addCards(['w0001', 'w0004'], t0)).toBe(1);
    const cards = await allCards();
    expect(cards).toHaveLength(4);
    const order = [...cards].sort((a, b) => a.addedAt - b.addedAt).map((c) => c.wordId);
    expect(order).toEqual(['w0003', 'w0001', 'w0002', 'w0004']);
  });

  it('limits new words per day and counts the ones introduced today', async () => {
    await addCards(['w0001', 'w0002', 'w0003'], t0);
    let plan = await sessionFor(t0, 2);
    expect(plan.queue.map((c) => c.wordId)).toEqual(['w0001', 'w0002']);
    await answerCard(plan.queue[0]!, 3, t0);
    expect(await newIntroducedToday(t0)).toBe(1);
    plan = await sessionFor(t0, 2);
    expect(plan.fresh).toBe(1);
    const updated = await getCard('w0001');
    expect(updated?.reps).toBe(1);
  });

  it('puts due reviews before new cards', () => {
    const due = { ...newStoredCard('w0009', t0), state: 2, due: t0.getTime() - 1000 };
    const later = { ...newStoredCard('w0008', t0), state: 2, due: t0.getTime() + 86_400_000 };
    const fresh = newStoredCard('w0001', t0);
    const plan = planSession([fresh, later, due], t0, 5);
    expect(plan.queue.map((c) => c.wordId)).toEqual(['w0009', 'w0001']);
    expect(plan).toMatchObject({ due: 1, fresh: 1 });
    expect(planSession([fresh], t0, 0).queue).toEqual([]);
  });
});
