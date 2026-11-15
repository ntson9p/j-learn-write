/**
 * Conjugation of the course's verbs and adjectives. Every generated form has
 * its written surface, its reading and tags naming the form, so that
 * - the tokenizer recognises inflected words (食べました = 食べる, masu+ta),
 * - the course checks that a sentence only uses forms already taught,
 * - furigana can be attached to the kanji of an inflected word.
 *
 * Classes follow JMdict part-of-speech codes. Forms are generated, never
 * typed by hand: one table of godan endings drives every godan verb.
 */

/** Conjugation classes handled here (JMdict codes; "vs-c" = word ending in する, e.g. コピーする). */
export type ConjClass =
  | 'v1'
  | 'v1-s'
  | 'v5u'
  | 'v5k'
  | 'v5k-s'
  | 'v5g'
  | 'v5s'
  | 'v5t'
  | 'v5n'
  | 'v5b'
  | 'v5m'
  | 'v5r'
  | 'v5r-i'
  | 'v5aru'
  | 'vk'
  | 'vs-i'
  | 'vs-c'
  | 'adj-i'
  | 'adj-ix';

export interface ConjForm {
  /** Written form, e.g. 食べました. */
  surface: string;
  /** Reading in kana, e.g. たべました. */
  reading: string;
  /** Form tags, outermost last, e.g. ["potential", "masu"]. Empty for the dictionary form. */
  tags: string[];
}

/** The conjugation class of a word from its JMdict parts of speech, or null for words that do not inflect. */
export function conjClassOf(word: string, pos: readonly string[]): ConjClass | null {
  for (const p of pos) {
    if (p === 'v1' || p === 'v1-s' || p === 'vk' || p === 'vs-i' || p === 'adj-i' || p === 'adj-ix') return p;
    if (p === 'v5aru' || p === 'v5k-s' || p === 'v5r-i') return p;
    if (/^v5[ukgstnbmr]$/.test(p)) return p as ConjClass;
  }
  if (pos.includes('vs') && word.endsWith('する') && word.length > 2) return 'vs-c';
  return null;
}

/** Godan ending rows: dictionary ending → [i (stem), a (negative), e (potential, ba), o (volitional), te, ta]. */
const GODAN: Record<string, [string, string, string, string, string, string]> = {
  v5u: ['い', 'わ', 'え', 'お', 'って', 'った'],
  v5k: ['き', 'か', 'け', 'こ', 'いて', 'いた'],
  'v5k-s': ['き', 'か', 'け', 'こ', 'って', 'った'],
  v5g: ['ぎ', 'が', 'げ', 'ご', 'いで', 'いだ'],
  v5s: ['し', 'さ', 'せ', 'そ', 'して', 'した'],
  v5t: ['ち', 'た', 'て', 'と', 'って', 'った'],
  v5n: ['に', 'な', 'ね', 'の', 'んで', 'んだ'],
  v5b: ['び', 'ば', 'べ', 'ぼ', 'んで', 'んだ'],
  v5m: ['み', 'ま', 'め', 'も', 'んで', 'んだ'],
  v5r: ['り', 'ら', 'れ', 'ろ', 'って', 'った'],
  'v5r-i': ['り', 'ら', 'れ', 'ろ', 'って', 'った'],
  v5aru: ['い', 'ら', 'れ', 'ろ', 'って', 'った'],
};

/** Parts of a conjugated verb: the stem forms each ending attaches to. */
interface VerbParts {
  /** 連用形 (食べ, 書き). */
  i: string;
  /** 未然形 for ない (食べ, 書か; こ for 来る, し for する). */
  a: string;
  /** Conditional ば base (食べれ, 書け). */
  e: string;
  /** Volitional (食べよう, 書こう). */
  vol: string;
  te: string;
  ta: string;
  /** Imperative (食べろ, 書け). */
  imp: string;
  /** Potential, conjugated as v1 (食べられる, 書ける); null when the verb has none here. */
  potential: string | null;
  passive: string;
  causative: string;
  /** Plain negative (ない; ある → ない). */
  nai: string;
}

function godanParts(stem: string, cls: string): VerbParts {
  const [i, a, e, o, te, ta] = GODAN[cls]!;
  return {
    i: stem + i,
    a: stem + a,
    e: stem + e,
    vol: `${stem + o}う`,
    te: stem + te,
    ta: stem + ta,
    imp: stem + (cls === 'v5aru' ? 'い' : e),
    potential: cls === 'v5r-i' || cls === 'v5aru' ? null : `${stem + e}る`,
    passive: `${stem + a}れる`,
    causative: `${stem + a}せる`,
    nai: cls === 'v5r-i' ? 'ない' : `${stem + a}ない`,
  };
}

function ichidanParts(stem: string, cls: 'v1' | 'v1-s'): VerbParts {
  return {
    i: stem,
    a: stem,
    e: `${stem}れ`,
    vol: `${stem}よう`,
    te: `${stem}て`,
    ta: `${stem}た`,
    imp: cls === 'v1-s' ? stem : `${stem}ろ`,
    potential: `${stem}られる`,
    passive: `${stem}られる`,
    causative: `${stem}させる`,
    nai: `${stem}ない`,
  };
}

/** 来る in kana (くる); `k` is what comes before it (empty for 来る itself). */
function kuruParts(k: string): VerbParts {
  return {
    i: `${k}き`,
    a: `${k}こ`,
    e: `${k}くれ`,
    vol: `${k}こよう`,
    te: `${k}きて`,
    ta: `${k}きた`,
    imp: `${k}こい`,
    potential: `${k}こられる`,
    passive: `${k}こられる`,
    causative: `${k}こさせる`,
    nai: `${k}こない`,
  };
}

/** する and noun + する (prefix before する). */
function suruParts(prefix: string): VerbParts {
  return {
    i: `${prefix}し`,
    a: `${prefix}し`,
    e: `${prefix}すれ`,
    vol: `${prefix}しよう`,
    te: `${prefix}して`,
    ta: `${prefix}した`,
    imp: `${prefix}しろ`,
    potential: prefix === '' ? null : `${prefix}できる`,
    passive: `${prefix}される`,
    causative: `${prefix}させる`,
    nai: `${prefix}しない`,
  };
}

/** Polite and plain forms built on verb parts. */
function verbForms(p: VerbParts, dict: string, withDerived: boolean): [string, string[]][] {
  const out: [string, string[]][] = [
    [dict, []],
    [p.i, ['stem']],
    [`${p.i}ます`, ['masu']],
    [`${p.i}ません`, ['masu', 'neg']],
    [`${p.i}ました`, ['masu', 'past']],
    [`${p.i}ませんでした`, ['masu', 'neg', 'past']],
    [`${p.i}ましょう`, ['masu', 'vol']],
    [`${p.i}ませんか`, ['masu', 'neg', 'ka']],
    [`${p.i}たい`, ['tai']],
    [`${p.i}たくない`, ['tai', 'neg']],
    [`${p.i}たかった`, ['tai', 'past']],
    [`${p.i}たくなかった`, ['tai', 'neg', 'past']],
    [`${p.i}たくて`, ['tai', 'te']],
    [`${p.i}ながら`, ['nagara']],
    [p.te, ['te']],
    [p.ta, ['ta']],
    [`${p.ta}ら`, ['tara']],
    [`${p.ta}り`, ['tari']],
    [p.nai, ['nai']],
    [`${p.nai.slice(0, -1)}かった`, ['nai', 'past']],
    [`${p.nai.slice(0, -1)}くて`, ['nai', 'te']],
    [`${p.nai}で`, ['naide']],
    [`${p.nai.slice(0, -1)}ければ`, ['nai', 'ba']],
    [`${p.nai.slice(0, -1)}くちゃ`, ['nai', 'kucha']],
    [`${p.e}ば`, ['ba']],
    [p.vol, ['vol']],
    [p.imp, ['imperative']],
  ];
  if (withDerived) {
    const derived: [string | null, string][] = [
      [p.potential, 'potential'],
      [p.passive, 'passive'],
      [p.causative, 'causative'],
    ];
    for (const [base, tag] of derived) {
      if (!base) continue;
      for (const [s, tags] of verbForms(ichidanParts(base.slice(0, -1), 'v1'), base, false)) out.push([s, [tag, ...tags]]);
    }
  }
  return out;
}

function adjectiveForms(stem: string, dict: string): [string, string[]][] {
  return [
    [dict, []],
    [stem, ['stem']],
    [`${stem}く`, ['ku']],
    [`${stem}くない`, ['neg']],
    [`${stem}くなかった`, ['neg', 'past']],
    [`${stem}かった`, ['past']],
    [`${stem}くて`, ['te']],
    [`${stem}くなくて`, ['neg', 'te']],
    [`${stem}ければ`, ['ba']],
    [`${stem}かったら`, ['tara']],
    [`${stem}そう`, ['sou']],
    [`${stem}さ`, ['sa']],
  ];
}

/** Forms of a dictionary form written in kana or kanji (the stem logic only looks at the ending). */
function formsOfText(dict: string, cls: ConjClass): [string, string[]][] {
  switch (cls) {
    case 'v1':
    case 'v1-s':
      return verbForms(ichidanParts(dict.slice(0, -1), cls), dict, true);
    case 'vk':
      return verbForms(kuruParts(dict.slice(0, -2)), dict, true);
    case 'vs-i':
      return verbForms(suruParts(''), dict, true);
    case 'vs-c':
      return verbForms(suruParts(dict.slice(0, -2)), dict, true);
    case 'adj-i':
      return adjectiveForms(dict.slice(0, -1), dict);
    case 'adj-ix':
      // いい / 良い: the inflected forms use よ (よくない, よかった).
      return [[dict, []], ...adjectiveForms(dict.endsWith('いい') ? `${dict.slice(0, -2)}よ` : dict.slice(0, -1), dict).slice(1)];
    default:
      return verbForms(godanParts(dict.slice(0, -1), cls), dict, true);
  }
}

/**
 * All forms of a word. `surface` is the written dictionary form (kanji or
 * kana), `reading` its reading. For 来る the kanji form keeps 来 and the
 * reading follows the form (来ます = きます).
 */
export function conjugate(surface: string, reading: string, cls: ConjClass): ConjForm[] {
  if (cls === 'vk') {
    // 来る: the forms differ in the first mora (くる, きます, こない); the kanji 来 replaces it.
    const kana = formsOfText(reading, cls);
    const kanji = surface !== reading && surface.endsWith('る') ? surface.slice(0, -2) + surface.at(-2)! : '';
    return kana.map(([k, tags]) => ({ surface: kanji ? kanji + k.slice(1) : k, reading: k, tags }));
  }
  const written = formsOfText(surface, cls);
  const spoken = formsOfText(reading, cls);
  return written.map(([s, tags], i) => ({ surface: s, reading: spoken[i]![0], tags }));
}
