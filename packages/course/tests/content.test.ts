/**
 * Checks the whole course content. CONTENT_FILTER=n5-03,n5-04 limits the
 * lesson files read (to check one lesson while writing it); the curriculum
 * is always checked whole.
 */
import { checkJaSentence, courseLexicon, graderLexicon } from '@j-learn-write/grader';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatLesson, kanjiReadingsMap, lessonFiles, loadCourseData } from '../scripts/lib/course-files';
import { correctTexts, validateCourse } from '../src/validate';

const FILTER = (process.env.CONTENT_FILTER ?? '').split(',').filter(Boolean);

describe('course content', () => {
  const data = loadCourseData(FILTER);
  const readings = kanjiReadingsMap();
  const tools = { lexicon: courseLexicon(data.names), kanjiReadings: (c: string) => readings.get(c) };

  it('passes every check', () => {
    expect(validateCourse(data, tools)).toEqual([]);
  });

  it('plans every kana, word, kanji and grammar point in exactly one lesson (also for levels still being written)', () => {
    const allComplete = { kana: 'complete', n5: 'complete', n4: 'complete' } as const;
    expect(validateCourse({ ...data, lessons: [], levels: allComplete }, tools)).toEqual([]);
  });

  it.skipIf(FILTER.length > 0)('has the content of every lesson of a complete level', () => {
    const written = new Set(data.lessons.map((l) => l.id));
    const missing = data.curriculum.filter((l) => data.levels[l.level] === 'complete' && !written.has(l.id)).map((l) => l.id);
    expect(missing).toEqual([]);
  });

  it('raises no grader issue on any correct sentence of the course', () => {
    const lexicon = graderLexicon();
    const flagged = data.lessons.flatMap((l) =>
      correctTexts(l).flatMap(({ text, where }) => {
        const issues = checkJaSentence(text, lexicon).issues;
        return issues.length > 0 ? [`${l.id} ${where}: 「${text}」 ${issues.map((i) => i.code).join(', ')}`] : [];
      }),
    );
    expect(flagged).toEqual([]);
  });

  it('names each file after its lesson and keeps the canonical format (npm run content:fill)', () => {
    for (const f of lessonFiles(FILTER)) {
      const [, level, order] = /lessons\/(\w+)\/(\d+)\.json$/.exec(f.path) ?? [];
      expect(f.lesson.id, f.path).toBe(`${level}-${order}`);
      expect(readFileSync(f.path, 'utf8'), f.path).toBe(formatLesson(f.lesson));
    }
  });
});
