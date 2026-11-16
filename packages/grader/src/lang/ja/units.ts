/**
 * Comparable units of a Japanese text: one per token (punctuation dropped),
 * carrying every analysis the tokenizer found, so that 私 and わたし, 食べます
 * and たべます compare equal, while 雨 and 飴 (same reading, other words) do not.
 */
import { isKana, isKanji, toHiragana } from './kana.ts';
import type { JaLexicon } from './lexicon.ts';
import { tokenize, type Token } from './tokenize.ts';

export interface Unit {
  surface: string;
  start: number;
  end: number;
  /** One key per analysis, form included: "w12:masu+neg", "f:wa:", "n:3", "c:3:本", "p:たなか", "u:…". */
  keys: Set<string>;
  /** Lemma of each analysis (form ignored): "w12", "f:wa". */
  lemmas: Set<string>;
  /** Forms (tag lists) of each lemma. */
  forms: Map<string, string[][]>;
  /** Hiragana readings. */
  readings: Set<string>;
  /** Written only in kana (and ー). */
  kana: boolean;
  hasKanji: boolean;
  /** Some analysis is a course word. */
  isWord: boolean;
  /** Some analysis is a particle. */
  particle: boolean;
  /** Some analysis is a copula (です, だ…). */
  copula: boolean;
  /** Not recognised at all. */
  unknown: boolean;
  /** Numbers, counted quantities and particles whose change alters the meaning (か, も). */
  critical: boolean;
}

/** Function words that are the same unit in two spellings. */
const SAME_FUNCTION: Record<string, string> = { ja: 'dewa' };
/** Particles whose omission or change alters the meaning: never a light edit. */
const CRITICAL_PARTICLES = new Set(['ka', 'mo']);

export function unitsOf(text: string, lexicon: JaLexicon): Unit[] {
  return tokenize(text, lexicon)
    .filter((t) => !t.analyses.every((a) => a.kind === 'punct'))
    .map(unitOf);
}

export function unitOf(t: Token): Unit {
  const u: Unit = {
    surface: t.surface,
    start: t.start,
    end: t.end,
    keys: new Set(),
    lemmas: new Set(),
    forms: new Map(),
    readings: new Set(),
    kana: [...t.surface].every(isKana),
    hasKanji: [...t.surface].some(isKanji),
    isWord: false,
    particle: false,
    copula: false,
    unknown: false,
    critical: false,
  };
  const add = (lemma: string, tags: readonly string[]) => {
    u.lemmas.add(lemma);
    u.keys.add(`${lemma}:${tags.join('+')}`);
    const list = u.forms.get(lemma) ?? [];
    list.push([...tags]);
    u.forms.set(lemma, list);
  };
  for (const a of t.analyses) {
    if ('reading' in a) u.readings.add(toHiragana(a.reading));
    switch (a.kind) {
      case 'word':
        u.isWord = true;
        add(`w${a.no}`, a.tags);
        break;
      case 'function': {
        const id = SAME_FUNCTION[a.id] ?? a.id;
        add(`f:${id}`, a.tags);
        if (a.role === 'particle') u.particle = true;
        if (a.role === 'copula') u.copula = true;
        if (CRITICAL_PARTICLES.has(a.id)) u.critical = true;
        break;
      }
      case 'number':
        add(`n:${a.value}`, []);
        u.critical = true;
        break;
      case 'counted':
        add(`c:${a.value ?? '?'}:${a.counter}`, []);
        u.critical = true;
        break;
      case 'name':
        add(`p:${toHiragana(a.reading)}`, []);
        break;
      case 'unknown':
        u.unknown = true;
        break;
      case 'punct':
        break;
    }
  }
  if (u.kana) u.readings.add(toHiragana(t.surface));
  if (u.unknown && u.keys.size === 0) u.keys.add(`u:${toHiragana(t.surface)}`);
  return u;
}

export const shareKey = (a: Unit, b: Unit) => [...a.keys].some((k) => b.keys.has(k));
export const shareLemma = (a: Unit, b: Unit) => [...a.lemmas].some((k) => b.lemmas.has(k));
export const shareReading = (a: Unit, b: Unit) => [...a.readings].some((r) => b.readings.has(r));

/** Plain-style equivalent of a polite verb form (食べます ~ 食べる, 食べませんでした ~ 食べなかった). */
const PLAIN_OF: Record<string, string> = {
  masu: '',
  'masu+neg': 'nai',
  'masu+past': 'ta',
  'masu+neg+past': 'nai+past',
  'masu+vol': 'vol',
};
/** Copulas that differ only in politeness. */
const PLAIN_COPULA: Record<string, string> = { 'f:desu': 'f:da', 'f:deshita': 'f:datta', 'f:deshou': 'f:darou' };

const plainTags = (tags: readonly string[]) => {
  const key = tags.join('+');
  return PLAIN_OF[key] ?? key;
};

/**
 * True when the two units are the same word in forms that differ only in
 * politeness (食べます / 食べる, です / だ).
 */
export function politenessPair(a: Unit, b: Unit): boolean {
  for (const [lemma, formsA] of a.forms) {
    const formsB = b.forms.get(lemma);
    if (formsB && formsA.some((fa) => formsB.some((fb) => plainTags(fa) === plainTags(fb)))) return true;
    const plain = PLAIN_COPULA[lemma];
    if (plain && b.lemmas.has(plain)) return true;
  }
  for (const lemma of b.lemmas) if (PLAIN_COPULA[lemma] && a.lemmas.has(PLAIN_COPULA[lemma]!)) return true;
  return false;
}

/** Kana that learners drop or add by mistake: small っ, long vowels, ー. */
const SLIP_KANA = new Set(['っ', 'ー', 'あ', 'い', 'う', 'え', 'お']);
const VOICING: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
};
const voicedPair = (x: string, y: string) => VOICING[x] === y || VOICING[y] === x;

/**
 * True when two kana spellings differ by one slip: a missing or extra small
 * っ, long vowel or ー (がこう / がっこう, せんせ / せんせい), or a missing or
 * extra voicing mark (かぎ / がぎ).
 */
export function spellingSlip(x: string, y: string): boolean {
  if (x === y) return false;
  const a = [...x];
  const b = [...y];
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const diff = a.flatMap((c, i) => (c === b[i] ? [] : [i]));
    return diff.length === 1 && voicedPair(a[diff[0]!]!, b[diff[0]!]!);
  }
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  for (let i = 0; i < long.length; i++) {
    if (long.slice(0, i).join('') + long.slice(i + 1).join('') === short.join('')) return SLIP_KANA.has(long[i]!);
  }
  return false;
}
