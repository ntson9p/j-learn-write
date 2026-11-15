/**
 * Checks the whole course content. CONTENT_FILTER=n5-03,n5-04 limits the
 * lesson files read (to check one lesson while writing it); the curriculum
 * is always checked whole.
 */
import { courseLexicon } from '@j-learn-write/grader';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatLesson, kanjiReadingsMap, lessonFiles, loadCourseData } from '../scripts/lib/course-files';
import { validateCourse } from '../src/validate';

const FILTER = (process.env.CONTENT_FILTER ?? '').split(',').filter(Boolean);

describe('course content', () => {
  const data = loadCourseData(FILTER);
  const readings = kanjiReadingsMap();
  const tools = { lexicon: courseLexicon(data.names), kanjiReadings: (c: string) => readings.get(c) };

  it('passes every check', () => {
    expect(validateCourse(data, tools)).toEqual([]);
  });

  it('names each file after its lesson and keeps the canonical format (npm run content:fill)', () => {
    for (const f of lessonFiles(FILTER)) {
      const [, level, order] = /lessons\/(\w+)\/(\d+)\.json$/.exec(f.path) ?? [];
      expect(f.lesson.id, f.path).toBe(`${level}-${order}`);
      expect(readFileSync(f.path, 'utf8'), f.path).toBe(formatLesson(f.lesson));
    }
  });
});
