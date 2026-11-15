/**
 * Exports lessons for teacher review as a CSV file (UTF-8 with BOM, opens in
 * Excel and Google Sheets).
 * Run: npm run review:export -w @j-learn-write/course -- <out.csv> [n5 | n5-03 …]
 */
import { writeFileSync } from 'node:fs';
import { toCsv } from '../src/csv.ts';
import { buildReviewRows } from '../src/review-sheet.ts';
import { loadCourseData } from './lib/course-files.ts';

const [out, ...filters] = process.argv.slice(2);
if (!out || !out.endsWith('.csv')) {
  console.error('usage: npm run review:export -- <out.csv> [lesson id prefixes]');
  process.exit(1);
}
const course = loadCourseData(filters);
const rows = buildReviewRows(course.lessons, course);
writeFileSync(out, toCsv(rows, true), 'utf8');
console.log(`wrote ${out}: ${rows.length - 1} item(s) from ${course.lessons.length} lesson(s)`);
