/**
 * Fills the furigana of every Japanese text of the lesson files and writes
 * them in the canonical format. Run: npm run content:fill -w @j-learn-write/course -- n5-03
 * (lesson id prefixes; none = every lesson).
 *
 * Readings come from the course words (tokenizer). An ambiguous reading
 * (降ります: ふります or おります) is taken from the existing markup when it
 * is one of the candidates; otherwise it is reported and must be written by
 * hand in the lesson's "ruby" map. A hand-written markup is kept when the
 * tokenizer cannot build one (unknown kanji).
 */
import { courseLexicon } from '@j-learn-write/grader';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuby, rubyText } from '../src/furigana.ts';
import type { ListWord, NameEntry } from '../src/types.ts';
import { lessonTexts } from '../src/validate.ts';
import { DATA, lessonFiles, rel, writeLesson } from './lib/course-files.ts';

const filters = process.argv.slice(2);
const vocabulary = JSON.parse(readFileSync(join(DATA, 'jlpt', 'vocabulary.json'), 'utf8')) as ListWord[];
const names = (JSON.parse(readFileSync(join(DATA, 'names.json'), 'utf8')) as { names: NameEntry[] }).names;
const rubyOf = new Map(vocabulary.map((w) => [w.no, w.ruby]));
const lexicon = courseLexicon(names);

let problems = 0;
for (const file of lessonFiles(filters)) {
  const before = file.lesson.ruby ?? {};
  const ruby: Record<string, string> = {};
  for (const t of lessonTexts(file.lesson)) {
    if (t.text in ruby) continue;
    const previous = before[t.text];
    const built = buildRuby(t.text, lexicon, (no) => rubyOf.get(no), previous);
    if (built.problems.length > 0 && previous !== undefined && rubyText(previous) === t.text) {
      ruby[t.text] = previous;
      continue;
    }
    ruby[t.text] = built.markup;
    for (const p of built.problems) {
      problems++;
      console.log(`${file.lesson.id} ${t.where}: 「${p.surface}」 ${p.message} — in 「${t.text}」`);
    }
  }
  file.lesson.ruby = ruby;
  if (writeLesson(file)) console.log('updated', rel(file.path));
}
if (problems > 0) {
  console.log(`${problems} furigana problems: write the reading by hand in the lesson's "ruby" map, then run this again.`);
  process.exitCode = 1;
}
