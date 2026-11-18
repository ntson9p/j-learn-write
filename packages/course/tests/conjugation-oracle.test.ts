/**
 * Independent check of the grader's conjugation tables with kuromoji (IPADIC).
 * The core forms of every course verb and adjective, written with kanji, must
 * be read the same way by kuromoji. Skipped: words whose dictionary form
 * kuromoji reads differently (homographs such as 開く あく / ひらく), and
 * surfaces that another course word also produces (降ります: 降る or 降りる),
 * where the reading depends on the word, not on the table. KUROMOJI_ERRORS
 * lists the remaining cases where IPADIC itself is wrong.
 */
import { conjClassOf, conjugate } from '@j-learn-write/grader';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ListWord } from '../src/types';
import { hira, kuromojiTokenizer } from './kuromoji';

const vocabulary = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'jlpt', 'vocabulary.json'), 'utf8')) as ListWord[];
const CORE = ['', 'masu', 'masu+neg', 'masu+past', 'masu+neg+past', 'te', 'ta', 'nai', 'nai+past', 'ba', 'vol', 'tai', 'tara', 'past', 'neg', 'ku'];
/** Surfaces IPADIC misreads (kuromoji reading in the comment). */
const KUROMOJI_ERRORS = new Set<string>([
  '甘かった', '甘かったら', // うまかった (旨い)
  '白ければ', // しらければ (白ける)
  '長ければ', // たければ (長ける)
  '入ろう', // にゅうろう
  '弾きます', '弾きません', '弾きました', '弾きませんでした', '弾きたい', // はじく (to flick); the course word is 弾く ひく
  '降ろう', // くだろう
  '打てば', // ぶてば
  '下ります', '下りません', '下りませんでした', // くだる; the course word is 下りる おりる
  '勝ったら', // まさったら (勝る)
  '正しく', '正しくない', // まさしく
]);

describe('conjugation tables (kuromoji oracle)', () => {
  it('reads the core forms like kuromoji', async () => {
    const tokenizer = await kuromojiTokenizer();
    const readingOf = (text: string) => hira(tokenizer.tokenize(text).map((t) => t.reading ?? t.surface_form).join(''));
    const all = vocabulary.flatMap((w) => {
      const cls = conjClassOf(w.word, w.pos);
      return cls ? conjugate(w.word, w.reading, cls).map((f) => ({ w, f })) : [];
    });
    const producers = new Map<string, Set<number>>();
    for (const { w, f } of all) producers.set(f.surface, (producers.get(f.surface) ?? new Set()).add(w.no));
    const problems: string[] = [];
    let checked = 0;
    for (const { w, f } of all) {
      if (!CORE.includes(f.tags.join('+')) || producers.get(f.surface)!.size > 1 || KUROMOJI_ERRORS.has(f.surface)) continue;
      if (readingOf(w.word) !== hira(w.reading)) continue;
      checked++;
      const reading = readingOf(f.surface);
      if (reading !== hira(f.reading)) problems.push(`${f.surface} [${f.tags.join('+')}]: ours ${f.reading}, kuromoji ${reading}`);
    }
    expect(checked).toBeGreaterThan(3000);
    expect(problems).toEqual([]);
  }, 60_000);
});
