/**
 * Dictionary search: by Japanese (kanji or kana, katakana = hiragana),
 * romaji (converted to kana with WanaKana), Vietnamese meaning or Hán Việt
 * (both without diacritics). Exact matches first, then prefixes, then the rest.
 */
import type { ListWord, WordContent } from '@j-learn-write/course';
import { hasJapanese, toHiragana } from '@j-learn-write/grader';
import { toHiragana as romajiToKana } from 'wanakana';

/** Lower case without Vietnamese diacritics ("Học sinh" -> "hoc sinh"). */
export function foldVi(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().normalize('NFC').trim();
}

const VOWEL_OF: Record<string, string> = {};
for (const [vowel, row] of Object.entries({
  あ: 'あかさたなはまやらわがざだばぱぁゃ',
  い: 'いきしちにひみりぎじぢびぴぃ',
  う: 'うくすつぬふむゆるぐずづぶぷぅゅ',
  え: 'えけせてねへめれげぜでべぺぇ',
  お: 'おこそとのほもよろをごぞどぼぽぉょ',
})) {
  for (const k of row) VOWEL_OF[k] = vowel;
}

/** Hiragana with ー written as the vowel it lengthens (コーヒー → こおひい), as romaji spells it. */
export function foldKana(text: string): string {
  let out = '';
  for (const ch of toHiragana(text)) out += ch === 'ー' ? (VOWEL_OF[out.at(-1) ?? ''] ?? '') : ch;
  return out;
}

/** Kana of a query typed in romaji ("gakusei" → "がくせい"), or null when it is not romaji. */
export function romajiQuery(query: string): string | null {
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  if (!/^[a-z'-]+$/.test(q)) return null;
  const kana = romajiToKana(q);
  return /[a-z]/.test(kana) ? null : kana;
}

export interface DictEntry {
  word: ListWord;
  content: WordContent | null;
}

/** Entries matching the query, best first; an empty query matches all, in list order. */
export function searchWords(entries: readonly DictEntry[], query: string): DictEntry[] {
  const q = query.trim();
  if (!q) return [...entries];
  const japanese = hasJapanese(q);
  const kana = japanese ? foldKana(q) : romajiQuery(q);
  const vi = foldVi(q);
  const ranked: { e: DictEntry; rank: number; i: number }[] = [];
  entries.forEach((e, i) => {
    const texts: string[] = [];
    if (japanese) texts.push(...e.word.forms);
    if (kana) texts.push(foldKana(e.word.reading));
    const needle = japanese ? [q, kana ?? q] : kana ? [kana] : [];
    let rank = 3;
    for (const t of texts) for (const n of needle) rank = Math.min(rank, t === n ? 0 : t.startsWith(n) ? 1 : t.includes(n) ? 2 : 3);
    if (!japanese && vi) {
      for (const t of [...(e.content?.meaningsVi ?? []), e.word.hanViet ?? ''].map(foldVi).filter(Boolean)) {
        rank = Math.min(rank, t === vi ? 0 : t.startsWith(vi) ? 1 : t.includes(vi) ? 2 : 3);
      }
    }
    if (rank < 3) ranked.push({ e, rank, i });
  });
  return ranked.sort((a, b) => a.rank - b.rank || a.i - b.i).map((r) => r.e);
}
