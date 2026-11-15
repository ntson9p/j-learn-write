/**
 * Deterministic tokenizer: no Intl.Segmenter (results differ between
 * browsers), no morphological dictionary (too large to ship). Words come from
 * the lexicon (course words with all their forms, function words, names);
 * numbers and number + counter are recognised by rule.
 *
 * The segmentation minimises a cost: each known token costs 10, each unknown
 * character 25, punctuation 1. Fewer, longer known tokens win; an unknown
 * stretch is kept as one "unknown" token so that rules around it stay silent.
 */
import { isKana, isKanji } from './kana.ts';
import type { Analysis, JaLexicon } from './lexicon.ts';
import { COUNTERS, counterReadings, numberReading, numberValue } from './numbers.ts';

export type TokenAnalysis =
  | Analysis
  | { kind: 'number'; value: number; reading: string }
  /** Number (or 何, value null) + counter: 三本, 何人, さんぼん. */
  | { kind: 'counted'; value: number | null; counter: string; reading: string }
  | { kind: 'punct' }
  | { kind: 'unknown' };

export interface Token {
  start: number;
  end: number;
  surface: string;
  /** Every analysis of this surface (at least one). */
  analyses: TokenAnalysis[];
}

const KNOWN_COST = 10;
const UNKNOWN_COST = 25;
const PUNCT_COST = 1;
const PUNCT = /[\p{P}\p{S}\s]/u;
const NUMBER_CHAR = /[0-9〇零一二三四五六七八九十百千万]/;
/** Readings of counted kana forms (さんぼん…) are generated for these numbers. */
const KANA_COUNT_NUMBERS: (number | null)[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, null];

let kanaCounted: Map<string, { value: number | null; counter: string }[]> | undefined;

/** Kana spellings of number + counter (ひとつ, さんぼん, なんにん…), built once. */
function kanaCountedForms(): Map<string, { value: number | null; counter: string }[]> {
  if (kanaCounted) return kanaCounted;
  const map = new Map<string, { value: number | null; counter: string }[]>();
  for (const c of COUNTERS) {
    if (!c.reading || ![...c.reading].every(isKana)) continue;
    for (const n of KANA_COUNT_NUMBERS) {
      for (const r of counterReadings(n, c)) map.set(r, [...(map.get(r) ?? []), { value: n, counter: c.counter }]);
    }
  }
  kanaCounted = map;
  return map;
}

interface Edge {
  end: number;
  analyses: TokenAnalysis[];
  cost: number;
}

function numberEdges(text: string, start: number): Edge[] {
  const out: Edge[] = [];
  let end = start;
  while (end < text.length && end - start < 12 && NUMBER_CHAR.test(text[end]!)) end++;
  // 何 + counter (何本, 何人).
  const runs: { len: number; value: number | null }[] = [];
  if (text[start] === '何') runs.push({ len: 1, value: null });
  for (let len = end - start; len >= 1; len--) {
    const value = numberValue(text.slice(start, start + len));
    if (value !== null) runs.push({ len, value });
  }
  for (const { len, value } of runs) {
    const after = start + len;
    for (const c of COUNTERS) {
      for (const form of [c.counter, ...(c.forms ?? [])]) {
        if (!text.startsWith(form, after)) continue;
        out.push({
          end: after + form.length,
          analyses: counterReadings(value, c).map((reading) => ({ kind: 'counted', value, counter: c.counter, reading })),
          cost: KNOWN_COST,
        });
      }
    }
    if (value !== null) out.push({ end: after, analyses: [{ kind: 'number', value, reading: numberReading(value) }], cost: KNOWN_COST });
  }
  return out;
}

function kanaCountedEdges(text: string, start: number): Edge[] {
  if (!isKana(text[start])) return [];
  const out: Edge[] = [];
  for (const [kana, hits] of kanaCountedForms()) {
    if (!text.startsWith(kana, start)) continue;
    out.push({
      end: start + kana.length,
      analyses: hits.map((h) => ({ kind: 'counted', value: h.value, counter: h.counter, reading: kana })),
      cost: KNOWN_COST,
    });
  }
  return out;
}

/** One code point (a kanji outside the BMP takes two UTF-16 units). */
function codePointEnd(text: string, start: number): number {
  return start + (text.codePointAt(start)! > 0xffff ? 2 : 1);
}

/** Tokens of a normalized Japanese text. */
export function tokenize(text: string, lexicon: JaLexicon): Token[] {
  const n = text.length;
  const best: ({ cost: number; from: number; edge: Edge } | undefined)[] = new Array(n + 1);
  best[0] = { cost: 0, from: -1, edge: { end: 0, analyses: [], cost: 0 } };
  for (let i = 0; i < n; i++) {
    const here = best[i];
    if (!here) continue;
    const edges: Edge[] = [];
    if (PUNCT.test(text[i]!)) edges.push({ end: i + 1, analyses: [{ kind: 'punct' }], cost: PUNCT_COST });
    for (const m of lexicon.matchesAt(text, i)) edges.push({ end: m.end, analyses: [...m.analyses], cost: KNOWN_COST });
    edges.push(...numberEdges(text, i), ...kanaCountedEdges(text, i));
    // Merge analyses of edges with the same span.
    const bySpan = new Map<number, Edge>();
    for (const e of edges) {
      const prev = bySpan.get(e.end);
      if (!prev) bySpan.set(e.end, { ...e, analyses: [...e.analyses] });
      else for (const a of e.analyses) if (!prev.analyses.some((x) => JSON.stringify(x) === JSON.stringify(a))) prev.analyses.push(a);
    }
    const ordered = [...bySpan.values()].sort((a, b) => b.end - a.end);
    if (!ordered.some((e) => e.analyses.some((a) => a.kind !== 'punct'))) {
      ordered.push({ end: codePointEnd(text, i), analyses: [{ kind: 'unknown' }], cost: UNKNOWN_COST });
    } else {
      ordered.push({ end: codePointEnd(text, i), analyses: [{ kind: 'unknown' }], cost: UNKNOWN_COST * 2 });
    }
    for (const e of ordered) {
      const cost = here.cost + e.cost;
      const cur = best[e.end];
      if (!cur || cost < cur.cost) best[e.end] = { cost, from: i, edge: e };
    }
  }
  const tokens: Token[] = [];
  for (let end = n; end > 0; ) {
    const b = best[end]!;
    tokens.push({ start: b.from, end, surface: text.slice(b.from, end), analyses: b.edge.analyses });
    end = b.from;
  }
  tokens.reverse();
  // Join consecutive unknown characters into one unknown token.
  const merged: Token[] = [];
  for (const t of tokens) {
    const prev = merged.at(-1);
    if (prev && isUnknown(prev) && isUnknown(t) && !PUNCT.test(t.surface)) {
      prev.end = t.end;
      prev.surface += t.surface;
    } else merged.push(t);
  }
  return merged;
}

export const isUnknown = (t: Token) => t.analyses.length === 1 && t.analyses[0]!.kind === 'unknown';

/** True when the token contains kanji (its reading matters for furigana). */
export const hasKanjiToken = (t: Token) => [...t.surface].some(isKanji);
