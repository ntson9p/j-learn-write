/**
 * Builds data/jlpt/{vocabulary,kanji,grammar}.json, data/jlpt/ids.lock.json
 * and data/kana.json from sources/. Run: npm run data:build -w @j-learn-write/course
 * (after npm run sources:fetch). The output only depends on sources/, the
 * lock file and data/hanviet-overrides.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildJlptData, jsonLines } from '../src/jlpt-build.ts';
import { DATA, loadBuildSources } from './lib/sources.ts';

const result = buildJlptData(loadBuildSources());
mkdirSync(join(DATA, 'jlpt'), { recursive: true });
const files: [string, string][] = [
  [join(DATA, 'jlpt', 'vocabulary.json'), jsonLines(result.vocabulary)],
  [join(DATA, 'jlpt', 'kanji.json'), jsonLines(result.kanji)],
  [join(DATA, 'jlpt', 'grammar.json'), jsonLines(result.grammar)],
  [join(DATA, 'jlpt', 'ids.lock.json'), `${JSON.stringify(result.lock, null, 1)}\n`],
  [join(DATA, 'kana.json'), jsonLines(result.kana)],
];
for (const [path, text] of files) writeFileSync(path, text, 'utf8');
console.log(`words ${result.vocabulary.length}, kanji ${result.kanji.length}, grammar ${result.grammar.length}, kana ${result.kana.length}`);
if (result.problems.length > 0) {
  console.log(`${result.problems.length} problems:`);
  for (const p of result.problems) console.log(`  ${p}`);
}
