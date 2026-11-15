import { beforeEach, describe, expect, it } from 'vitest';
import { backupFileName, BackupError, exportBackup, importBackup, validateBackup } from '../src/lib/backup';
import { clearAll, db, DB_VERSION } from '../src/lib/db';

async function seed() {
  const d = await db();
  await d.put('settings', { key: 'settings', value: { theme: 'dark' } });
  await d.put('cards', {
    wordId: 'w0001', due: 1000, stability: 2.3, difficulty: 2.1, scheduledDays: 0, learningSteps: 1,
    reps: 1, lapses: 0, state: 1, lastReview: 500, addedAt: 500,
  });
  await d.add('reviewLogs', { wordId: 'w0001', time: 500, rating: 3, state: 0, scheduledDays: 0, stability: 0, difficulty: 0 });
  await d.put('lessons', { lessonId: 'n5-01', startedAt: 1, completedAt: null, bestScore: 0, exercises: {} });
}

describe('backup', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('round-trips every store', async () => {
    await seed();
    const backup = await exportBackup(new Date('2026-11-14T00:00:00Z'));
    expect(backup.schemaVersion).toBe(DB_VERSION);
    expect(backup.stores.cards).toHaveLength(1);
    expect(backup.stores.reviewLogs[0]).toMatchObject({ id: 1, wordId: 'w0001' });
    const json = JSON.parse(JSON.stringify(backup));
    await clearAll();
    expect(await (await db()).count('cards')).toBe(0);
    await importBackup(json);
    const again = await exportBackup(new Date('2026-11-14T00:00:00Z'));
    expect(again).toEqual(backup);
  });

  it('rejects files that are not backups, and keeps the data', async () => {
    await seed();
    await expect(importBackup({ hello: 1 })).rejects.toBeInstanceOf(BackupError);
    await expect(importBackup({ app: 'j-learn-write', kind: 'backup', schemaVersion: 99, stores: {} })).rejects.toThrow(/mới hơn/);
    expect(await (await db()).count('cards')).toBe(1);
  });

  it('reports missing and duplicate keys in Vietnamese', () => {
    const errors = validateBackup({
      app: 'j-learn-write',
      kind: 'backup',
      schemaVersion: 1,
      stores: { cards: [{ wordId: 'a' }, { wordId: 'a' }, { due: 1 }], reviewLogs: [{ id: 'x' }], other: [] },
    });
    expect(errors).toEqual([
      'Phần "cards", mục 2: khóa "a" bị trùng.',
      'Phần "cards", mục 3: thiếu khóa "wordId".',
      'Phần "reviewLogs", mục 1: thiếu khóa "id".',
      'Phần "other" không thuộc ứng dụng.',
    ]);
  });

  it('names files by date', () => {
    expect(backupFileName(new Date('2026-11-14T10:00:00Z'))).toBe('hoc-tieng-nhat-sao-luu-2026-11-14.json');
  });
});
