/**
 * What the Japanese pack knows: the course words with every conjugated form,
 * function words, counters and (optionally) proper names, indexed by written
 * surface. One surface can have several analyses (降ります: 降る or 降りる);
 * the tokenizer keeps them all and callers decide.
 */
import { conjClassOf, conjugate } from './conjugate.ts';
import functionFile from './data/function-words.json' with { type: 'json' };
import { isKana, toHiragana } from './kana.ts';

/** A course word (generated from packages/course data/jlpt/vocabulary.json). */
export interface WordEntry {
  /** Word number in the course list. */
  no: number;
  /** Display form. */
  word: string;
  /** Reading in kana. */
  reading: string;
  /** Other written forms (kana form, other kanji). */
  forms: string[];
  /** JMdict parts of speech. */
  pos: string[];
}

export type FunctionRole = 'particle' | 'copula' | 'aux' | 'prefix' | 'suffix' | 'interjection';

export interface FunctionWord {
  text: string;
  reading: string;
  role: FunctionRole;
  id: string;
  conj?: 'adj-i';
}

export interface NameEntry {
  ja: string;
  reading: string;
}

export type Analysis =
  | { kind: 'word'; no: number; word: string; reading: string; tags: string[]; pos: string[] }
  | { kind: 'function'; id: string; role: FunctionRole; reading: string; tags: string[] }
  | { kind: 'name'; reading: string };

export const FUNCTION_WORDS: readonly FunctionWord[] = functionFile.words as FunctionWord[];

export class JaLexicon {
  private readonly bySurface = new Map<string, Analysis[]>();
  /** Longest indexed surface, in UTF-16 units. */
  readonly maxLength: number;
  readonly words: readonly WordEntry[];

  constructor(words: readonly WordEntry[], options: { names?: readonly NameEntry[] } = {}) {
    this.words = words;
    for (const w of words) {
      const cls = conjClassOf(w.word, w.pos);
      for (const spelling of new Set([w.word, ...w.forms])) {
        // A spelling written only in kana is read as it is written (a katakana word keeps its katakana).
        const reading = [...spelling].every(isKana) ? spelling : w.reading;
        const forms = cls ? conjugate(spelling, reading, cls) : [{ surface: spelling, reading, tags: [] }];
        for (const f of forms) this.add(f.surface, { kind: 'word', no: w.no, word: w.word, reading: f.reading, tags: f.tags, pos: w.pos });
      }
    }
    for (const fw of FUNCTION_WORDS) {
      const forms = fw.conj ? conjugate(fw.text, fw.reading, fw.conj) : [{ surface: fw.text, reading: fw.reading, tags: [] }];
      for (const f of forms) this.add(f.surface, { kind: 'function', id: fw.id, role: fw.role, reading: f.reading, tags: f.tags });
    }
    for (const n of options.names ?? []) this.add(n.ja, { kind: 'name', reading: n.reading });
    this.maxLength = Math.max(1, ...[...this.bySurface.keys()].map((k) => k.length));
  }

  private add(surface: string, a: Analysis): void {
    const list = this.bySurface.get(surface);
    if (!list) this.bySurface.set(surface, [a]);
    else if (!list.some((x) => sameAnalysis(x, a))) list.push(a);
  }

  /** Analyses of an exact surface (empty when unknown). */
  analyses(surface: string): readonly Analysis[] {
    return this.bySurface.get(surface) ?? [];
  }

  /** Surfaces starting at `start` in `text`, longest first, with their analyses. */
  matchesAt(text: string, start: number): { end: number; analyses: readonly Analysis[] }[] {
    const out: { end: number; analyses: readonly Analysis[] }[] = [];
    const max = Math.min(this.maxLength, text.length - start);
    for (let len = max; len >= 1; len--) {
      const found = this.bySurface.get(text.slice(start, start + len));
      if (found) out.push({ end: start + len, analyses: found });
    }
    return out;
  }
}

function sameAnalysis(a: Analysis, b: Analysis): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'word' && b.kind === 'word') return a.no === b.no && a.reading === b.reading && a.tags.join('+') === b.tags.join('+');
  if (a.kind === 'function' && b.kind === 'function') return a.id === b.id && a.tags.join('+') === b.tags.join('+');
  return a.reading === b.reading;
}

/** Reading of an analysis in hiragana. */
export const hiraganaReading = (a: { reading: string }) => toHiragana(a.reading);
