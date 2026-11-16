/**
 * Comparable units of a Japanese text: one per token (punctuation dropped),
 * carrying every analysis the tokenizer found, so that 私 and わたし, 食べます
 * and たべます compare equal, while 雨 and 飴 (same reading, other words) do not.
 */
import { conjClassOf } from './conjugate.ts';
import { isKana, isKanji, toHiragana } from './kana.ts';
import type { JaLexicon } from './lexicon.ts';
import { tokenize, type Token } from './tokenize.ts';

type Kind = 'adj' | 'verb' | 'aru' | 'iru';

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
  /** Numbers, counted quantities and particles whose change alters the meaning (か, も, だけ, しか). */
  critical: boolean;
  /** A particle that may be missing but not replaced by another one (から, まで, より). */
  noSwap: boolean;
  /** Inflecting class of each word lemma: adjective (高い), verb, or ある / いる themselves. */
  kinds: Map<string, Kind>;
}

/** Function words that are the same unit in two spellings. */
const SAME_FUNCTION: Record<string, string> = { ja: 'dewa', n: 'no' };
/**
 * Particles whose omission or change alters the meaning: never a light edit.
 * から/まで (from/until, or because), より (comparison: 英語は日本語より / 英語より日本語が),
 * だけ, しか (only).
 */
const CRITICAL_PARTICLES = new Set(['ka', 'mo', 'dake', 'shika']);
/**
 * Particles that may be forgotten (a light edit) but never swapped for
 * another particle: から/まで (from/until), より (英語は日本語より / 英語より日本語が).
 */
const NO_SWAP_PARTICLES = new Set(['kara', 'made', 'yori']);
/** Polite question endings of auxiliaries (いけませんか): another sentence than the statement. */
const POLITE_QUESTION = /ま(?:す|せん)か$/u;

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
    noSwap: false,
    kinds: new Map(),
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
      case 'word': {
        u.isWord = true;
        add(`w${a.no}`, a.tags);
        const cls = conjClassOf(a.word, a.pos);
        if (cls) u.kinds.set(`w${a.no}`, a.word === 'ある' ? 'aru' : a.word === 'いる' && cls === 'v1' ? 'iru' : cls.startsWith('adj') ? 'adj' : 'verb');
        break;
      }
      case 'function': {
        const id = SAME_FUNCTION[a.id] ?? a.id;
        add(`f:${id}`, a.id !== 'ka' && POLITE_QUESTION.test(t.surface) ? [...a.tags, 'q'] : a.tags);
        if (a.role === 'particle') u.particle = true;
        if (a.role === 'copula') u.copula = true;
        if (CRITICAL_PARTICLES.has(a.id)) u.critical = true;
        if (NO_SWAP_PARTICLES.has(a.id)) u.noSwap = true;
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

/** Plain-style equivalent of a polite verb ending (食べます ~ 食べる, 食べられませんでした ~ 食べられなかった). */
const PLAIN_OF: [RegExp, string][] = [
  [/(^|\+)masu\+neg\+past$/, '$1nai+past'],
  [/(^|\+)masu\+neg$/, '$1nai'],
  [/(^|\+)masu\+past$/, '$1ta'],
  [/(^|\+)masu\+vol$/, '$1vol'],
  [/(^|\+)masu$/, ''],
];
/** Copulas that differ only in politeness. */
const PLAIN_COPULA: Record<string, string> = { 'f:desu': 'f:da', 'f:deshita': 'f:datta', 'f:deshou': 'f:darou' };

const plainTags = (tags: readonly string[]) => {
  const key = tags.filter((t) => t !== 'pol' && t !== 'plain').join('+');
  const rule = PLAIN_OF.find(([re]) => re.test(key));
  return rule ? key.replace(rule[0], rule[1]).replace(/^\+|\+$/g, '') : key;
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
    if (long.slice(0, i).join('') + long.slice(i + 1).join('') !== short.join('')) continue;
    // おいしいそう (hearsay) is not a slip for おいしそう (looks tasty).
    if (long[i] === 'い' && long.slice(i + 1, i + 3).join('') === 'そう') return false;
    return SLIP_KANA.has(long[i]!);
  }
  return false;
}

// ---------------------------------------------------------------- predicates in several tokens

/** Plain forms of an adjective that take です to become polite (高い, 高かった, 高くない, 高くなかった). */
const ADJ_PLAIN = new Set(['', 'past', 'neg', 'neg+past']);


type Form = { lemma: string; tags: string[] };

/** Lemmas and tags of the words in `u` of one of `kinds` whose tags pass `test` (あつい: 暑い, 熱い, 厚い). */
function wordForms(u: Unit, kinds: readonly string[], test: (tags: string) => boolean): Form[] {
  const out: Form[] = [];
  for (const [lemma, kind] of u.kinds) {
    if (!kinds.includes(kind)) continue;
    const tags = u.forms.get(lemma)?.find((t) => test(t.join('+')));
    if (tags) out.push({ lemma, tags });
  }
  return out;
}

/** Polite form of a plain verb form in ない: 行かない → 行きません (masu+neg). */
function politeNai(tags: readonly string[]): string[] {
  const key = tags.join('+');
  const polite = key.endsWith('nai+past') ? `${key.slice(0, -'nai+past'.length)}masu+neg+past` : `${key.slice(0, -'nai'.length)}masu+neg`;
  return polite.split('+');
}

/**
 * The polite forms of plain adjective-like forms followed by です: 高い+です,
 * 高くない+です, 行かない+です (= 行きません), 食べたい+です.
 */
function politeWithDesu(u: Unit): Form[] {
  return [
    ...wordForms(u, ['adj'], (t) => ADJ_PLAIN.has(t)).map((f) => ({ lemma: f.lemma, tags: [...f.tags, 'pol'] })),
    ...wordForms(u, ['verb', 'aru', 'iru'], (t) => /(^|\+)nai(\+past)?$/.test(t)).map((f) => ({ lemma: f.lemma, tags: politeNai(f.tags) })),
    ...wordForms(u, ['verb', 'aru', 'iru'], (t) => /(^|\+)tai(\+neg)?(\+past)?$/.test(t) || /^(yasui|nikui)(\+neg)?(\+past)?$/.test(t)).map((f) => ({ lemma: f.lemma, tags: [...f.tags, 'pol'] })),
  ];
}

function mergedUnit(parts: readonly Unit[], forms: readonly Form[]): Unit {
  let readings = [''];
  for (const p of parts) readings = readings.flatMap((r) => [...p.readings].map((x) => r + x)).slice(0, 16);
  const kinds = new Map<string, Kind>();
  const formMap = new Map<string, string[][]>();
  for (const f of forms) {
    const kind = parts.map((p) => p.kinds.get(f.lemma)).find((k) => k !== undefined);
    if (kind) kinds.set(f.lemma, kind);
    formMap.set(f.lemma, [...(formMap.get(f.lemma) ?? []), [...f.tags]]);
  }
  return {
    surface: parts.map((p) => p.surface).join(''),
    start: parts[0]!.start,
    end: parts[parts.length - 1]!.end,
    keys: new Set(forms.map((f) => `${f.lemma}:${f.tags.join('+')}`)),
    lemmas: new Set(forms.map((f) => f.lemma)),
    forms: formMap,
    readings: new Set(readings),
    kana: parts.every((p) => p.kana),
    hasKanji: parts.some((p) => p.hasKanji),
    isWord: forms.some((f) => f.lemma.startsWith('w')),
    particle: false,
    copula: forms.every((f) => f.lemma.startsWith('f:')),
    unknown: false,
    critical: false,
    noSwap: false,
    kinds,
  };
}

const isDesu = (u: Unit | undefined) => !!u && u.lemmas.has('f:desu');
/** でしょう/だろう after です (高いですでしょう) is a mistake: です is then not joined. */
const isCopulaAfter = (u: Unit | undefined) => !!u && (u.lemmas.has('f:deshou') || u.lemmas.has('f:darou'));
const naiOf = (u: Unit | undefined) => (u ? wordForms(u, ['aru'], (t) => t === 'nai' || t === 'nai+past')[0] : undefined);

/**
 * Joins the tokens of one predicate so that equivalent polite and plain forms
 * compare as one unit:
 * - 高くありません = 高くないです (polite), 高くない (plain);
 * - 行きません = 行かないです; 高いです (polite) ~ 高い (plain);
 * - ではありません = じゃないです (polite), じゃない (plain), and the past forms.
 */
export function joinPredicates(units: readonly Unit[]): Unit[] {
  const out: Unit[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    const next = units[i + 1];
    // じゃ/では + ない (+ です)
    const nai = u.lemmas.has('f:dewa') ? naiOf(next) : undefined;
    if (nai) {
      const past = nai.tags.includes('past');
      const lemma = past ? 'f:dewa-arimasen-deshita' : 'f:dewa-arimasen';
      const polite = isDesu(units[i + 2]);
      const parts = units.slice(i, i + (polite ? 3 : 2));
      out.push(mergedUnit(parts, [{ lemma, tags: polite ? [] : ['plain'] }]));
      i += parts.length - 1;
      continue;
    }
    // 食べて + いる/います/いた… = 食べてる (ている said quickly)
    const te = wordForms(u, ['verb', 'aru', 'iru'], (t) => /^(?:(?:potential|passive|causative|causative-passive)\+)?te$/.test(t));
    const iru = te.length > 0 && next ? wordForms(next, ['iru'], () => true)[0] : undefined;
    if (iru) {
      out.push(mergedUnit([u, next!], te.map((f) => ({ lemma: f.lemma, tags: [...f.tags.slice(0, -1), 'teiru', ...iru.tags] }))));
      i++;
      continue;
    }
    // 高く + ありません(でした)
    const ku = wordForms(u, ['adj'], (t) => t === 'ku');
    const arimasen = ku.length > 0 && next ? wordForms(next, ['aru'], (t) => t === 'masu+neg' || t === 'masu+neg+past')[0] : undefined;
    if (arimasen) {
      const tags = arimasen.tags.includes('past') ? ['neg', 'past', 'pol'] : ['neg', 'pol'];
      out.push(mergedUnit([u, next!], ku.map((f) => ({ lemma: f.lemma, tags }))));
      i++;
      continue;
    }
    // 高い + です, 行かない + です
    const polite = isDesu(next) && !isCopulaAfter(units[i + 2]) ? politeWithDesu(u) : [];
    if (polite.length > 0) {
      out.push(mergedUnit([u, next!], polite));
      i++;
      continue;
    }
    out.push(u);
  }
  return out;
}
