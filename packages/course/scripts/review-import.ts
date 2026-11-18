/**
 * Imports a reviewed CSV (see review-export.ts) into the lesson files.
 * Nothing is written when any row has a problem.
 * Run: npm run review:import -w @j-learn-write/course -- <in.csv> [--date YYYY-MM-DD]
 */
import { readFileSync } from 'node:fs';
import { parseCsvObjects } from '../src/csv.ts';
import { applyReviewRows } from '../src/review-sheet.ts';
import { lessonFiles, rel, writeLesson } from './lib/course-files.ts';

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.csv'));
const dateArg = args[args.indexOf('--date') + 1];
const date = args.includes('--date') && dateArg ? dateArg : new Date().toISOString().slice(0, 10);
if (!file || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('usage: npm run review:import -- <in.csv> [--date YYYY-MM-DD]');
  process.exit(1);
}
const files = lessonFiles();
const result = applyReviewRows(
  files.map((f) => f.lesson),
  parseCsvObjects(readFileSync(file, 'utf8')),
  date,
);
if (result.errors.length > 0) {
  console.error('Không nhập được (chưa ghi gì):');
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}
for (const f of files) if (writeLesson(f)) console.log('updated', rel(f.path));
console.log(`${result.updated} mục đã được cập nhật trạng thái duyệt.`);
