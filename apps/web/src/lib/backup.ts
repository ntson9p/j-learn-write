/**
 * Backup and restore of every store as one JSON file. Restoring replaces all
 * data, in a single transaction: a bad file never leaves half-imported data.
 */
import { db, DB_VERSION, STORES, type StoreName } from './db';

export const BACKUP_APP = 'j-learn-write';
export const BACKUP_KIND = 'backup';

export interface Backup {
  app: typeof BACKUP_APP;
  kind: typeof BACKUP_KIND;
  schemaVersion: number;
  exportedAt: string;
  stores: Record<StoreName, Record<string, unknown>[]>;
}

const STORE_NAMES = Object.keys(STORES) as StoreName[];

export async function exportBackup(now: Date = new Date()): Promise<Backup> {
  const database = await db();
  const tx = database.transaction(STORE_NAMES, 'readonly');
  const stores = {} as Backup['stores'];
  for (const name of STORE_NAMES) {
    stores[name] = (await tx.objectStore(name).getAll()) as unknown as Record<string, unknown>[];
  }
  await tx.done;
  return { app: BACKUP_APP, kind: BACKUP_KIND, schemaVersion: DB_VERSION, exportedAt: now.toISOString(), stores };
}

/** Problems found in a backup file, in Vietnamese; empty when it can be restored. */
export function validateBackup(input: unknown): string[] {
  const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  if (!isObject(input)) return ['File không phải là file sao lưu của ứng dụng.'];
  if (input.app !== BACKUP_APP || input.kind !== BACKUP_KIND) return ['File không phải là file sao lưu của ứng dụng.'];
  const version = input.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return ['File sao lưu thiếu số phiên bản.'];
  if (version > DB_VERSION) return ['File sao lưu được tạo bởi phiên bản ứng dụng mới hơn. Hãy cập nhật ứng dụng rồi thử lại.'];
  if (!isObject(input.stores)) return ['File sao lưu không có dữ liệu.'];
  const errors: string[] = [];
  for (const name of STORE_NAMES) {
    const records = input.stores[name];
    if (records === undefined) continue;
    if (!Array.isArray(records)) {
      errors.push(`Phần "${name}" phải là một danh sách.`);
      continue;
    }
    const { keyPath, autoIncrement } = STORES[name];
    const seen = new Set<unknown>();
    records.forEach((record, i) => {
      if (!isObject(record)) {
        errors.push(`Phần "${name}", mục ${i + 1}: không hợp lệ.`);
        return;
      }
      const key = record[keyPath];
      const validKey = autoIncrement ? typeof key === 'number' && Number.isInteger(key) && key > 0 : typeof key === 'string' && key.length > 0;
      if (!validKey) errors.push(`Phần "${name}", mục ${i + 1}: thiếu khóa "${keyPath}".`);
      else if (seen.has(key)) errors.push(`Phần "${name}", mục ${i + 1}: khóa "${String(key)}" bị trùng.`);
      seen.add(key);
    });
  }
  for (const name of Object.keys(input.stores)) {
    if (!(name in STORES)) errors.push(`Phần "${name}" không thuộc ứng dụng.`);
  }
  return errors;
}

/** Replaces all local data with the backup. Throws (and changes nothing) when it is invalid. */
export async function importBackup(input: unknown): Promise<void> {
  const errors = validateBackup(input);
  if (errors.length > 0) throw new BackupError(errors);
  const backup = input as Backup;
  const database = await db();
  const tx = database.transaction(STORE_NAMES, 'readwrite');
  const work: Promise<unknown>[] = [];
  for (const name of STORE_NAMES) {
    const store = tx.objectStore(name);
    work.push(store.clear());
    for (const record of backup.stores[name] ?? []) work.push(store.put(record as never));
  }
  await Promise.all([...work, tx.done]);
}

export class BackupError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('\n'));
    this.name = 'BackupError';
  }
}

/** File name such as hoc-tieng-nhat-sao-luu-2026-11-14.json. */
export function backupFileName(now: Date = new Date()): string {
  return `hoc-tieng-nhat-sao-luu-${now.toISOString().slice(0, 10)}.json`;
}
