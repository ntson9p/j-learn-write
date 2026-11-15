/**
 * Sino-Vietnamese (Hán Việt) readings of kanji: two sources are compared.
 *
 * - KANJIDIC2 (`vietnam` readings): keyed by the Japanese form, but readings
 *   come in alphabetical order (not "main reading first") and some are wrong
 *   for Japanese-only forms (着 "Khán", 桜 "Tí").
 * - ph0ngp/hanviet-pinyin-wordlist: keyed by traditional characters, so a
 *   Japanese form (図) is looked up through its traditional form (圖).
 *
 * A reading both sources agree on is trusted; anything else is flagged for a
 * teacher (docs/plan.md, 3.3).
 */

const TONE_MARKS = new Set([0x300, 0x301, 0x303, 0x309, 0x323].map((c) => String.fromCharCode(c)));
/** Syllables written with final i or y (kì / kỳ, lí / lý): compared as the same. */
const I_OR_Y = /^(k|l|m|t|h|s)y$/;

/**
 * Comparison key of a syllable: lower case, tone mark separated from the
 * letters (hỏa = hoả), final y = i after one consonant (kỳ = kì).
 */
export function syllableKey(syllable: string): string {
  const nfd = syllable.trim().toLowerCase().normalize('NFD');
  const tone = [...nfd].filter((c) => TONE_MARKS.has(c)).join('');
  let base = [...nfd]
    .filter((c) => !TONE_MARKS.has(c))
    .join('')
    .normalize('NFC');
  if (I_OR_Y.test(base)) base = `${base.slice(0, -1)}i`;
  return `${base}|${tone}`;
}

/** Readings of ph0ngp's hanviet.csv: traditional character → readings, file order, no duplicates. */
export function parseHanvietCsv(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const line of text.split('\n').slice(1)) {
    const m = /^([^,]+),"?\[(.*)\]"?,/.exec(line);
    if (!m) continue;
    const char = m[1]!;
    const readings = [...m[2]!.matchAll(/'([^']*)'/g)].map((r) => r[1]!.normalize('NFC'));
    const list = out.get(char) ?? [];
    for (const r of readings) if (!list.some((x) => syllableKey(x) === syllableKey(r))) list.push(r);
    out.set(char, list);
  }
  return out;
}

/** OpenCC JPShinjitaiCharacters.txt: Japanese form → traditional forms. */
export function parseShinjitai(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || !line.includes('\t')) continue;
    const [from, to] = line.split('\t');
    out.set(from!, to!.split(' ').filter(Boolean));
  }
  return out;
}

export interface HanVietChoice {
  /** Main reading (lower case), or '' when the sources give nothing usable. */
  main: string;
  /** Other readings, from the word list (ph0ngp), in its order. */
  others: string[];
  /** True when the main reading still needs a teacher's choice. */
  ambiguous: boolean;
  /** How the reading was found. */
  basis: 'agreed' | 'override' | 'wordlist-only' | 'kanjidic-only' | 'none';
}

export interface HanVietSources {
  /** KANJIDIC2 `vietnam` readings by Japanese character. */
  kanjidic: ReadonlyMap<string, readonly string[]>;
  /** ph0ngp readings by traditional character. */
  wordlist: ReadonlyMap<string, readonly string[]>;
  /** OpenCC Japanese → traditional forms. */
  shinjitai: ReadonlyMap<string, readonly string[]>;
  /**
   * Draft main readings chosen by the course author for ambiguous characters.
   * An empty string marks a kanji made in Japan (kokuji, e.g. 込) that has no
   * Hán Việt reading.
   */
  overrides: Readonly<Record<string, string>>;
}

/** Word-list readings of a Japanese character, through its traditional forms. */
export function wordlistReadings(char: string, src: Pick<HanVietSources, 'wordlist' | 'shinjitai'>): string[] {
  const out: string[] = [];
  for (const form of [char, ...(src.shinjitai.get(char) ?? [])]) {
    for (const r of src.wordlist.get(form) ?? []) if (!out.some((x) => syllableKey(x) === syllableKey(r))) out.push(r);
  }
  return out;
}

/**
 * Picks the main Hán Việt reading of a kanji:
 * - one reading common to both sources → that one;
 * - an author override → that one, still flagged ambiguous when the sources
 *   do not agree on exactly that reading alone;
 * - only the word list has readings → its first one, flagged;
 * - only KANJIDIC2 has readings → its first one, flagged;
 * - otherwise nothing.
 */
export function chooseHanViet(char: string, src: HanVietSources): HanVietChoice {
  const listed = wordlistReadings(char, src);
  const kd = new Set((src.kanjidic.get(char) ?? []).map(syllableKey));
  const common = listed.filter((r) => kd.has(syllableKey(r)));
  const override = src.overrides[char];
  // KANJIDIC2 readings are not always in NFC: normalise every output.
  const lower = (s: string) => s.normalize('NFC').toLowerCase();
  if (override === '') return { main: '', others: [], ambiguous: false, basis: 'override' };
  if (override !== undefined) {
    const main = lower(override);
    const others = listed.filter((r) => syllableKey(r) !== syllableKey(main)).map(lower);
    const agreed = common.length === 1 && syllableKey(common[0]!) === syllableKey(main);
    return { main, others, ambiguous: !agreed, basis: 'override' };
  }
  if (common.length === 1) {
    const main = lower(common[0]!);
    return { main, others: listed.filter((r) => r !== common[0]).map(lower), ambiguous: false, basis: 'agreed' };
  }
  if (common.length > 1) {
    return { main: lower(common[0]!), others: listed.filter((r) => r !== common[0]).map(lower), ambiguous: true, basis: 'agreed' };
  }
  if (listed.length > 0) return { main: lower(listed[0]!), others: listed.slice(1).map(lower), ambiguous: true, basis: 'wordlist-only' };
  const kdList = src.kanjidic.get(char) ?? [];
  if (kdList.length > 0) return { main: lower(kdList[0]!), others: kdList.slice(1).map(lower), ambiguous: true, basis: 'kanjidic-only' };
  return { main: '', others: [], ambiguous: true, basis: 'none' };
}

/** True when `reading` is one of the known readings of the character (either source). */
export function isKnownReading(char: string, reading: string, src: Pick<HanVietSources, 'kanjidic' | 'wordlist' | 'shinjitai'>): boolean {
  const key = syllableKey(reading);
  return wordlistReadings(char, src).some((r) => syllableKey(r) === key) || (src.kanjidic.get(char) ?? []).some((r) => syllableKey(r) === key);
}
