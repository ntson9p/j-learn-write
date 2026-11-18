/**
 * Prints what a lesson must teach and what its sentences may use, for the
 * author of the lesson. Run: npm run content:brief -w @j-learn-write/course -- n5-03
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ListKanji } from '../src/types.ts';
import { DATA, loadCourseData, PKG } from './lib/course-files.ts';

const id = process.argv[2];
if (!id) throw new Error('usage: npm run content:brief -w @j-learn-write/course -- <lesson id>');
const data = loadCourseData(['none']);
const meta = data.curriculum.find((l) => l.id === id);
if (!meta) throw new Error(`no lesson ${id} in data/curriculum.json`);
const levelRank = { kana: 0, n5: 1, n4: 2 } as const;
const rank = (l: { level: keyof typeof levelRank; order: number }) => levelRank[l.level] * 1000 + l.order;
const earlier = data.curriculum.filter((l) => rank(l) < rank(meta));

const oj = JSON.parse(readFileSync(join(PKG, 'sources', 'openjlpt', 'vocabulary.json'), 'utf8')) as { id: string; meaningsEn: string[] }[];
const ojGrammar = JSON.parse(readFileSync(join(PKG, 'sources', 'openjlpt', 'grammar.json'), 'utf8')) as { id: string; meaning: string }[];
const kd = JSON.parse(readFileSync(join(PKG, 'sources', 'kanjidic2', 'kanji.json'), 'utf8')) as { char: string; meaningsEn: string[] }[];
const extraGrammar = (JSON.parse(readFileSync(join(DATA, 'grammar-extra.json'), 'utf8')) as { points: { id: string; titleVi: string }[] }).points;
const meaningOf = new Map(oj.map((w) => [w.id, w.meaningsEn.join('; ')]));
const grammarMeaning = new Map([...ojGrammar.map((g) => [g.id, g.meaning] as const), ...extraGrammar.map((g) => [g.id, `(course point) ${g.titleVi}`] as const)]);

console.log(`# ${meta.id} — ${meta.titleVi} (${meta.topicVi})\n`);
if (meta.kana?.length) console.log(`Kana: ${meta.kana.join(' ')}\nKana learnt before: ${earlier.flatMap((l) => l.kana ?? []).join('')}\n`);
if (meta.words?.length) {
  console.log('## Words (no, word, reading, pos, Hán Việt, English meaning for reference)');
  for (const no of meta.words) {
    const w = data.vocabulary.find((x) => x.no === no)!;
    console.log(`- ${w.no} ${w.word} 【${w.reading}】 ${w.pos.join(',')} ${w.hanViet ? `HV: ${w.hanViet}${w.hanVietAmbiguous ? '*' : ''}` : ''} — ${meaningOf.get(w.openjlptId) ?? (w.extra ? 'course extra word' : '')}${w.forms.length > 1 ? ` (forms: ${w.forms.join(' ')})` : ''}`);
  }
}
if (meta.kanji?.length) {
  console.log('\n## Kanji to learn (char, on, kun, Hán Việt, English meaning)');
  for (const ch of meta.kanji) {
    const k = data.kanji.find((x) => x.char === ch) as ListKanji;
    console.log(`- ${ch} on: ${k.on.join('、')} kun: ${k.kun.join('、')} HV: ${k.hanViet}${k.hanVietAmbiguous ? '*' : ''} (${k.hanVietOthers.join(', ')}) — ${kd.find((x) => x.char === ch)?.meaningsEn.join('; ')}`);
  }
}
if (meta.grammar?.length) {
  console.log('\n## Grammar points');
  for (const g of meta.grammar) console.log(`- ${g}: ${data.grammar.find((x) => x.id === g)?.pattern} — ${grammarMeaning.get(g) ?? ''}`);
}
const knownGrammar = earlier.flatMap((l) => l.grammar ?? []);
console.log(`\n## Grammar taught before (${knownGrammar.length}): ${knownGrammar.join(', ')}`);
const knownWords = earlier.flatMap((l) => l.words ?? []).map((n) => data.vocabulary.find((w) => w.no === n)!);
console.log(`\n## Words taught before (${knownWords.length}): ${knownWords.map((w) => w.word).join('、')}`);
console.log(`\n## Names allowed: ${data.names.map((n) => n.ja).join('、')}`);
