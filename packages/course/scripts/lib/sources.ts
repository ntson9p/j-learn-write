/** Reads the source subsets in sources/ (Node scripts and tests). */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toRomaji } from 'wanakana';
import { parseHanvietCsv, parseShinjitai } from '../../src/hanviet.ts';
import type { BuildSources, ExtraWord, FuriEntry, IdsLock, JmEntry, KdChar, OjGrammar, OjKanji, OjWord } from '../../src/jlpt-build.ts';

export const PKG = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SOURCES = join(PKG, 'sources');
export const DATA = join(PKG, 'data');

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

export function loadBuildSources(): BuildSources {
  const lockPath = join(DATA, 'jlpt', 'ids.lock.json');
  return {
    vocabulary: readJson<OjWord[]>(join(SOURCES, 'openjlpt', 'vocabulary.json')),
    extraWords: readJson<{ words: ExtraWord[] }>(join(DATA, 'vocabulary-extra.json')).words,
    kanji: readJson<OjKanji[]>(join(SOURCES, 'openjlpt', 'kanji.json')),
    grammar: readJson<OjGrammar[]>(join(SOURCES, 'openjlpt', 'grammar.json')),
    jmdict: readJson<JmEntry[]>(join(SOURCES, 'jmdict', 'entries.json')),
    kanjidic: readJson<KdChar[]>(join(SOURCES, 'kanjidic2', 'kanji.json')),
    furigana: readJson<FuriEntry[]>(join(SOURCES, 'jmdict-furigana', 'furigana.json')),
    hanviet: {
      wordlist: parseHanvietCsv(readFileSync(join(SOURCES, 'hanviet', 'hanviet.csv'), 'utf8')),
      shinjitai: parseShinjitai(readFileSync(join(SOURCES, 'opencc-jp', 'JPShinjitaiCharacters.txt'), 'utf8')),
      overrides: readJson<{ kanji: Record<string, string> }>(join(DATA, 'hanviet-overrides.json')).kanji,
    },
    wordHanViet: readJson<{ words: Record<string, string> }>(join(DATA, 'hanviet-overrides.json')).words,
    strokeCounts: readJson<Record<string, number>>(join(SOURCES, 'kanjivg', 'stroke-counts.json')),
    toRomaji: (kana: string) => toRomaji(kana),
    lock: existsSync(lockPath) ? readJson<IdsLock>(lockPath) : { words: {} },
  };
}
