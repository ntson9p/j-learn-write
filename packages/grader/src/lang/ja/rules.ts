/**
 * Grammar rules on one Japanese sentence. Each rule reports a mistake only
 * when it is sure (precision first): the words involved must be known
 * course words in the rule's word lists (data/rules.json); anything else
 * keeps the rule silent. Every issue carries a fix.
 */
import type { Fix, Issue } from '../../core/types.ts';
import { conjClassOf, conjugate } from './conjugate.ts';
import rulesFile from './data/rules.json' with { type: 'json' };
import { jaIssue } from './issues.ts';
import { isKana, toHiragana } from './kana.ts';
import type { Analysis, JaLexicon, WordEntry } from './lexicon.ts';
import { vi } from './messages.ts';
import { COUNTERS, counterReadings, numberReading } from './numbers.ts';
import { tokenize, type Token, type TokenAnalysis } from './tokenize.ts';

type Penalties = Readonly<Record<string, number>>;
type WordAnalysis = Extract<Analysis, { kind: 'word' }>;

export interface RuleLists {
  animate: Set<number>;
  inanimate: Set<number>;
  places: Set<number>;
  actionVerbs: Set<number>;
  actionNouns: Set<number>;
  counters: Map<number, string[]>;
  byNo: Map<number, WordEntry>;
  aru: number;
  iru: number;
  suru: number;
  sumu: number;
  movement: Set<number>;
  wh: Set<number>;
}

const listsCache = new WeakMap<JaLexicon, RuleLists>();

/** The word lists of data/rules.json, resolved to course word numbers. */
export function ruleLists(lexicon: JaLexicon): RuleLists {
  return listsOf(lexicon);
}

function listsOf(lexicon: JaLexicon): RuleLists {
  const cached = listsCache.get(lexicon);
  if (cached) return cached;
  const find = (spec: string): number => {
    const [word, reading] = spec.split('|');
    const found = lexicon.words.filter((w) => w.word === word && (!reading || w.reading === reading));
    if (found.length !== 1) throw new Error(`rules.json: "${spec}" matches ${found.length} course words`);
    return found[0]!.no;
  };
  const set = (specs: readonly string[]) => new Set(specs.map(find));
  const verb = (word: string, pos: string) => lexicon.words.find((w) => w.word === word && w.pos.includes(pos))?.no ?? -1;
  const lists: RuleLists = {
    animate: set(rulesFile.animate),
    inanimate: set([...rulesFile.inanimate, ...rulesFile.places]),
    places: set(rulesFile.places),
    actionVerbs: set(rulesFile.actionVerbs),
    actionNouns: set(rulesFile.actionNouns),
    counters: new Map(Object.entries(rulesFile.nounCounters as Record<string, string[]>).map(([spec, cs]) => [find(spec), cs])),
    byNo: new Map(lexicon.words.map((w) => [w.no, w])),
    aru: verb('ある', 'v5r-i'),
    iru: verb('いる', 'v1'),
    suru: verb('する', 'vs-i'),
    sumu: verb('住む', 'v5m'),
    movement: new Set(['行く', '来る', '帰る'].map((w) => lexicon.words.find((x) => x.word === w)?.no ?? -1)),
    wh: new Set(['誰', 'どなた', '何', 'どれ'].flatMap((w) => lexicon.words.filter((x) => x.word === w).map((x) => x.no))),
  };
  listsCache.set(lexicon, lists);
  return lists;
}

// ---------------------------------------------------------------- token helpers

const words = (t: Token | undefined): WordAnalysis[] => (t ? t.analyses.filter((a): a is WordAnalysis => a.kind === 'word') : []);
const hasWord = (t: Token | undefined, set: ReadonlySet<number>) => words(t).some((a) => set.has(a.no));
const fn = (t: Token | undefined, ...ids: string[]) => !!t && t.analyses.some((a) => a.kind === 'function' && ids.includes(a.id));
const isName = (t: Token | undefined) => !!t && t.analyses.some((a) => a.kind === 'name');
const isUnknown = (t: Token | undefined) => !!t && t.analyses.length === 1 && t.analyses[0]!.kind === 'unknown';
const isPunct = (t: Token | undefined) => !!t && t.analyses.every((a) => a.kind === 'punct');
const isNoun = (t: Token | undefined) => words(t).some((a) => a.pos.includes('n') || a.pos.includes('pn')) || isName(t);
const tagsOf = (a: WordAnalysis) => a.tags.join('+');

/** The form of a course word with the given tags, in the script the learner used (kanji or kana). */
function formOf(lists: RuleLists, no: number, tags: string, kana: boolean): string | undefined {
  const w = lists.byNo.get(no);
  if (!w) return undefined;
  const cls = conjClassOf(w.word, w.pos);
  const spelling = kana ? w.reading : w.word;
  if (!cls) return tags === '' ? spelling : undefined;
  return conjugate(spelling, w.reading, cls).find((f) => f.tags.join('+') === tags)?.surface;
}

const kanaOnly = (s: string) => [...s].every(isKana);

// ---------------------------------------------------------------- rules

type Rule = (tokens: readonly Token[], lists: RuleLists, p: Penalties, out: Issue[], text: string, lexicon: JaLexicon) => void;

const wrongTeCache = new WeakMap<JaLexicon, Map<string, string>>();

/**
 * Wrong て/た-forms of the group I verbs: the ます-stem + て/た (書きて, 行きた,
 * 読みで), mapped to the right form (書いて, 行った, 読んで). Spellings that are
 * a real word or form are left out.
 */
function wrongTeForms(lexicon: JaLexicon): Map<string, string> {
  const cached = wrongTeCache.get(lexicon);
  if (cached) return cached;
  const map = new Map<string, string>();
  for (const w of lexicon.words) {
    const cls = conjClassOf(w.word, w.pos);
    if (!cls || !cls.startsWith('v5')) continue;
    for (const spelling of new Set([w.word, w.reading])) {
      const forms = conjugate(spelling, w.reading, cls);
      const form = (tags: string) => forms.find((f) => f.tags.join('+') === tags)?.surface;
      const stem = form('stem');
      const te = form('te');
      const ta = form('ta');
      if (!stem || !te || !ta) continue;
      // A stem that is also a noun (休み) takes で/だ as a copula: 休みで, 休みだ are right.
      const noun = lexicon.analyses(stem).some((a) => a.kind === 'word' && a.tags.length === 0);
      for (const [suffix, right] of [['て', te], ['で', te], ['た', ta], ['だ', ta]] as const) {
        if (noun && (suffix === 'で' || suffix === 'だ')) continue;
        if (stem + suffix !== right) map.set(stem + suffix, right);
      }
    }
  }
  for (const wrong of [...map.keys()]) if (lexicon.analyses(wrong).length > 0) map.delete(wrong);
  wrongTeCache.set(lexicon, map);
  return map;
}

/** What may follow a て/た-form written in kana (so that かきて is not read in 書き手). */
const AFTER_TE = /^(ください|います|いる|いました|いません|も|は|から|[、。！？]|$)/u;

/** 書きて → 書いて, 行きた → 行った: a group I verb stem followed by て/た. */
const teForm: Rule = (tokens, lists, p, out, text, lexicon) => {
  const starts = new Set(tokens.map((t) => t.start));
  const ends = new Set(tokens.map((t) => t.end));
  for (const [wrong, right] of wrongTeForms(lexicon)) {
    for (let at = text.indexOf(wrong); at >= 0; at = text.indexOf(wrong, at + 1)) {
      // The wrong form must be whole tokens (行きたい is 行き + たい, not 行きた + い).
      if (!starts.has(at) || !ends.has(at + wrong.length)) continue;
      if (kanaOnly(wrong) && !AFTER_TE.test(text.slice(at + wrong.length))) continue;
      const fix: Fix = { start: at, end: at + wrong.length, replacement: right };
      out.push(jaIssue(p, 'te_form', fix.start, fix.end, vi.teForm(wrong, right), fix));
    }
  }
};

/**
 * い-adjectives conjugated like nouns (高いじゃありません, 高いでした), な-adjectives
 * conjugated like い-adjectives (きれいくない), な-adjectives with の (有名の人),
 * い-adjectives with な (高いな本).
 */
/** Words after which 高いだ is surely wrong: end of sentence, よ, ね, から, けど, し, が, と(思う), ので. */
const AFTER_DA = ['yo', 'ne', 'kara', 'kedo', 'keredo', 'keredomo', 'shi', 'ga', 'to', 'node'];

const adjectiveForm: Rule = (tokens, lists, p, out) => {
  tokens.forEach((t, i) => {
    const next = tokens[i + 1];
    const after = tokens[i + 2];
    for (const a of words(t)) {
      const adjI = a.pos.includes('adj-i') || a.pos.includes('adj-ix');
      const adjNa = a.pos.includes('adj-na') && !adjI;
      const kana = kanaOnly(t.surface);
      if (adjI && next && ['past', 'neg', 'neg+past'].includes(tagsOf(a)) && fn(next, 'da') && (!after || isPunct(after) || fn(after, ...AFTER_DA))) {
        const fix: Fix = { start: next.start, end: next.end, replacement: '' };
        out.push(jaIssue(p, 'adjective_form', t.start, next.end, vi.adjectiveDa(t.surface + next.surface, t.surface), fix));
        return;
      }
      if (adjI && tagsOf(a) === '' && next) {
        let right: string | undefined;
        let end = next.end;
        if (fn(next, 'dewa-arimasen')) right = `${formOf(lists, a.no, 'ku', kana)}ありません`;
        else if (fn(next, 'dewa-arimasen-deshita')) right = `${formOf(lists, a.no, 'ku', kana)}ありませんでした`;
        else if (fn(next, 'dewa', 'ja') && fn(after, 'nai')) {
          // おもしろいじゃなかった(です) → おもしろくなかった(です)
          const past = after!.analyses.some((x) => x.kind === 'function' && x.id === 'nai' && x.tags.includes('past'));
          right = formOf(lists, a.no, past ? 'neg+past' : 'neg', kana);
          end = after!.end;
        } else if (fn(next, 'deshita')) right = `${formOf(lists, a.no, 'past', kana)}です`;
        if (right && !right.startsWith('undefined')) {
          const fix: Fix = { start: t.start, end, replacement: right };
          out.push(jaIssue(p, 'adjective_form', fix.start, fix.end, vi.adjectiveI(t.surface + tokensText(tokens, i + 1, end), right), fix));
          return;
        }
        // 高いだ。→ 高い (だ only follows nouns and な-adjectives).
        if (fn(next, 'da') && (!after || isPunct(after) || fn(after, ...AFTER_DA))) {
          const fix: Fix = { start: next.start, end: next.end, replacement: '' };
          out.push(jaIssue(p, 'adjective_form', t.start, next.end, vi.adjectiveDa(t.surface + next.surface, t.surface), fix));
          return;
        }
        if (fn(next, 'na') && isNoun(after) && !isPunct(after)) {
          const fix: Fix = { start: next.start, end: next.end, replacement: '' };
          out.push(jaIssue(p, 'adjective_form', t.start, next.end, vi.adjectiveI(t.surface + next.surface, t.surface), fix));
          return;
        }
      }
      if (adjNa && next) {
        const noun = !a.pos.includes('n') && !a.pos.includes('adj-no');
        if (noun && fn(next, 'no') && isNoun(after) && !fn(after, 'no')) {
          const fix: Fix = { start: next.start, end: next.end, replacement: 'な' };
          out.push(jaIssue(p, 'adjective_form', t.start, next.end, vi.adjectiveNa(t.surface + next.surface, `${t.surface}な`), fix));
          return;
        }
      }
    }
  });
};

/**
 * な-adjectives conjugated like い-adjectives (きれいくない → きれいじゃない,
 * きれいかった → きれいでした). Found in the text: the tokenizer cannot read
 * such wrong forms (きれ + いく + ない).
 */
const naAdjectiveForm: Rule = (tokens, lists, p, out, text, lexicon) => {
  const starts = new Set(tokens.map((t) => t.start));
  // Longest first: かったです → でした (not でしたです).
  const RIGHT: [string, string][] = [
    ['くありません', 'じゃありません'],
    ['かったです', 'でした'],
    ['くない', 'じゃない'],
    ['かった', 'でした'],
  ];
  const done = new Set<number>();
  for (const w of lexicon.words) {
    if (!w.pos.includes('adj-na') || w.pos.includes('adj-i')) continue;
    for (const spelling of new Set([w.word, w.reading])) {
      for (const [wrong, right] of RIGHT) {
        for (let at = text.indexOf(spelling + wrong); at >= 0; at = text.indexOf(spelling + wrong, at + 1)) {
          if (!starts.has(at) || done.has(at)) continue;
          done.add(at);
          const start = at + spelling.length;
          const fix: Fix = { start, end: start + wrong.length, replacement: right };
          out.push(jaIssue(p, 'adjective_form', at, fix.end, vi.adjectiveNa(spelling + wrong, spelling + right), fix));
        }
      }
    }
  }
};

/** Text of tokens from index `from` up to character `end`. */
function tokensText(tokens: readonly Token[], from: number, end: number): string {
  let out = '';
  for (let k = from; k < tokens.length && tokens[k]!.start < end; k++) out += tokens[k]!.surface;
  return out;
}

/** 誰は来ましたか → 誰が: a question word as subject takes が. */
const whWa: Rule = (tokens, lists, p, out) => {
  const question = /(か|？)[。！？]*$/.test(tokens.map((t) => t.surface).join(''));
  if (!question) return;
  tokens.forEach((t, i) => {
    const next = tokens[i + 1];
    if (!hasWord(t, lists.wh) || !fn(next, 'wa')) return;
    const fix: Fix = { start: next!.start, end: next!.end, replacement: 'が' };
    out.push(jaIssue(p, 'wh_wa', t.start, next!.end, vi.whWa(t.surface), fix));
  });
};

/** わたしわ → わたしは, ほんお よみます → ほんを, がっこうえ いきます → がっこうへ. */
const particleKana: Rule = (tokens, lists, p, out) => {
  tokens.forEach((t, i) => {
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    if (!prev || !next || isPunct(next) || !isNoun(prev) || fn(prev, 'wa', 'ga', 'o', 'ni', 'de', 'e', 'to', 'mo', 'no')) return;
    let right: string | undefined;
    if (t.surface === 'わ' && !t.analyses.some((a) => a.kind === 'function' || a.kind === 'word')) right = 'は';
    else if (t.surface === 'お' && fn(t, 'o-prefix') && words(next).some((a) => a.tags[0] === 'masu' && /^v/.test(a.pos.join(' ')))) right = 'を';
    else if (t.surface === 'え' && hasWord(prev, lists.places) && hasWord(next, lists.movement)) right = 'へ';
    if (!right) return;
    const sound = { は: 'wa', を: 'o', へ: 'e' }[right]!;
    out.push(jaIssue(p, 'particle_kana', t.start, t.end, vi.particleKana(t.surface, right, sound), { start: t.start, end: t.end, replacement: right }));
  });
};

/** 猫があります → います, 本がいます → あります. */
const isQuantity = (t: Token | undefined) => !!t && t.analyses.some((a) => a.kind === 'number' || (a.kind === 'counted' && a.value !== null));
/** Counters of people and animals: 3人あります is wrong (います). */
const ANIMATE_COUNTERS = new Set(['人', '匹']);

const aruIru: Rule = (tokens, lists, p, out) => {
  const report = (subject: Token, verb: Token | undefined, animate: boolean, inanimate: boolean, name: string) => {
    for (const a of words(verb)) {
      const target = animate && a.no === lists.aru ? lists.iru : inanimate && a.no === lists.iru ? lists.aru : undefined;
      if (target === undefined) continue;
      const right = formOf(lists, target, tagsOf(a), kanaOnly(verb!.surface));
      if (!right) continue;
      const fix: Fix = { start: verb!.start, end: verb!.end, replacement: right };
      out.push(jaIssue(p, 'aru_iru', subject.start, verb!.end, vi.aruIru(name, target === lists.iru ? 'います' : 'あります'), fix));
      return true;
    }
    return false;
  };
  tokens.forEach((t, i) => {
    // 3人あります with no subject: the counter says it is people or animals.
    if (countedOf(t).some((c) => c.value !== null && ANIMATE_COUNTERS.has(c.counter)) && !isQuantity(tokens[i - 1])) {
      const k = fn(tokens[i + 1], 'mo') ? i + 2 : i + 1;
      if (report(t, tokens[k], true, false, t.surface)) return;
    }
    // 誰かありますか, 誰もありません: the question word with か/も.
    let pi = i + 1;
    if (hasWord(t, lists.wh) && fn(tokens[pi], 'ka') && !fn(tokens[pi + 1], 'ga', 'wa', 'mo')) pi--;
    else if (hasWord(t, lists.wh) && fn(tokens[pi], 'ka')) pi++;
    const particle = tokens[pi];
    const viaWh = pi === i;
    if (!viaWh && !fn(particle, 'ga', 'wa', 'mo')) return;
    // The verb follows, possibly after a quantity (子供が3人います, 本が2冊もあります) or a
    // place phrase (猫は机の下にいます: nouns, の, and a final に).
    let k = viaWh ? i + 2 : pi + 1;
    if (isQuantity(tokens[k])) {
      k++;
      if (fn(tokens[k], 'mo')) k++;
    } else {
      const from = k;
      while (tokens[k] && (isNoun(tokens[k]) || fn(tokens[k], 'no')) && !words(tokens[k]).some((a) => a.no === lists.aru || a.no === lists.iru)) k++;
      if (k > from && fn(tokens[k], 'ni')) k++;
      else if (k > from) return;
    }
    const verb = tokens[k];
    if (!verb) return;
    // People: listed words and anything with さん, くん, さま, たち (names alone may be places: 大阪, ハノイ).
    const animate = hasWord(t, lists.animate) || fn(t, 'san', 'kun', 'sama', 'tachi');
    const inanimate = !animate && hasWord(t, lists.inanimate);
    report(t, verb, animate, inanimate, t.surface);
  });
};

const niDe: Rule = (tokens, lists, p, out) => {
  tokens.forEach((t, i) => {
    const particle = tokens[i + 1];
    if (!particle) return;
    // ハノイで住んでいます: a named place where one lives takes に.
    if (isName(t) && fn(particle, 'de') && words(tokens[i + 2]).some((a) => a.no === lists.sumu)) {
      const fix: Fix = { start: particle.start, end: particle.end, replacement: 'に' };
      out.push(jaIssue(p, 'ni_de', t.start, particle.end, vi.niDeExist(t.surface, tokens[i + 2]!.surface), fix));
      return;
    }
    if (!hasWord(t, lists.places)) return;
    if (fn(particle, 'ni')) {
      // The action verb comes right after (or after one object with を), as the predicate (not 遊びに行く).
      let k = i + 2;
      if (fn(tokens[k + 1], 'o') && isNoun(tokens[k])) k += 2;
      const v = tokens[k];
      const actionNoun = hasWord(v, lists.actionNouns) && words(tokens[k + 1]).some((a) => a.no === lists.suru);
      const verbToken = actionNoun ? tokens[k + 1] : v;
      const isAction = actionNoun || hasWord(v, lists.actionVerbs);
      if (!isAction || !verbToken) return;
      const purpose = words(verbToken).some((a) => a.tags[0] === 'stem') && fn(tokens[tokens.indexOf(verbToken) + 1], 'ni');
      if (purpose) return;
      const fix: Fix = { start: particle.start, end: particle.end, replacement: 'で' };
      out.push(jaIssue(p, 'ni_de', t.start, particle.end, vi.niDeAction(t.surface, (actionNoun ? v!.surface : '') + verbToken.surface), fix));
    } else if (fn(particle, 'de')) {
      const v = tokens[i + 2];
      if (!v) return;
      const exists = words(v).some((a) => a.no === lists.iru || a.no === lists.sumu);
      if (!exists) return;
      const fix: Fix = { start: particle.start, end: particle.end, replacement: 'に' };
      out.push(jaIssue(p, 'ni_de', t.start, particle.end, vi.niDeExist(t.surface, v.surface), fix));
    }
  });
};

/** Counted analyses of a token. */
const countedOf = (t: Token | undefined) =>
  (t?.analyses ?? []).filter((a): a is Extract<TokenAnalysis, { kind: 'counted' }> => a.kind === 'counted');

/**
 * Counters: a noun counted with a counter of another kind (鉛筆を三枚 → 三本);
 * a number right before a countable noun (三りんご).
 */
const counters: Rule = (tokens, lists, p, out) => {
  const allowed = (t: Token | undefined) => words(t).flatMap((a) => lists.counters.get(a.no) ?? []);
  // Only counters that count things are compared; 円, 時, 歳, 回… measure something else (この傘は500円です).
  const counting = new Set([...lists.counters.values()].flat().concat('つ', '個'));
  const check = (noun: Token, counted: Token) => {
    const ok = allowed(noun);
    const c = countedOf(counted)[0];
    if (ok.length === 0 || !c || !counting.has(c.counter) || countedOf(counted).some((x) => ok.includes(x.counter))) return;
    // つ counts most things; it is only wrong for people and animals.
    if (c.counter === 'つ' && !ok.some((x) => x === '人' || x === '匹')) return;
    const right = ok[0]!;
    const counterText = counted.surface.slice(counted.surface.length - (COUNTERS.find((x) => x.counter === c.counter)?.counter.length ?? 1));
    const replacement = /^\d/.test(counted.surface) || /[一二三四五六七八九十百千万何]/.test(counted.surface[0] ?? '')
      ? counted.surface.slice(0, counted.surface.length - counterText.length) + right
      : undefined;
    const fix: Fix | undefined = replacement ? { start: counted.start, end: counted.end, replacement } : undefined;
    out.push(jaIssue(p, 'wrong_counter', counted.start, counted.end, vi.wrongCounter(noun.surface, right, c.counter), fix));
  };
  tokens.forEach((t, i) => {
    // noun + (が|を|は|も) + counted, or noun + counted
    if (countedOf(t).length > 0) {
      const before = tokens[i - 1];
      const noun = fn(before, 'ga', 'o', 'wa', 'mo') ? tokens[i - 2] : before;
      if (noun && allowed(noun).length > 0) check(noun, t);
      // counted + の + noun
      if (fn(tokens[i + 1], 'no') && allowed(tokens[i + 2]).length > 0) check(tokens[i + 2]!, t);
    }
    // number + countable noun
    const number = t.analyses.find((a) => a.kind === 'number');
    if (number && countedOf(t).length === 0 && allowed(tokens[i + 1]).length > 0 && !isPunct(tokens[i + 1])) {
      out.push(jaIssue(p, 'missing_counter', t.start, tokens[i + 1]!.end, vi.missingCounter(t.surface)));
    }
  });
};

let naiveReadings: Map<string, string> | undefined;

/** Kana spellings of number + counter without the sound change (さんほん), with the right one (さんぼん). */
function naiveCounterReadings(): Map<string, string> {
  if (naiveReadings) return naiveReadings;
  const map = new Map<string, string>();
  for (const c of COUNTERS) {
    if (!c.reading || !kanaOnly(c.reading)) continue;
    for (let n = 1; n <= 10; n++) {
      const valid = counterReadings(n, c);
      const naive = numberReading(n) + c.reading;
      if (!valid.includes(naive) && valid[0]) map.set(naive, valid[0]);
    }
  }
  naiveReadings = map;
  return map;
}

/** さんほん → さんぼん, いちほん → いっぽん (number + counter written in kana without its sound change). */
const counterReading: Rule = (tokens, lists, p, out) => {
  const text = tokens.map((t) => t.surface).join('');
  const starts = new Set(tokens.map((t) => t.start));
  const ends = new Set(tokens.map((t) => t.end));
  const base = tokens[0]?.start ?? 0;
  for (const [naive, right] of naiveCounterReadings()) {
    for (let at = text.indexOf(naive); at >= 0; at = text.indexOf(naive, at + 1)) {
      const start = base + at;
      const end = start + naive.length;
      if (!starts.has(start) || !ends.has(end)) continue;
      out.push(jaIssue(p, 'counter_reading', start, end, vi.counterReading(naive, right), { start, end, replacement: right }));
    }
  }
};

/** Nouns a plain-form clause modifies: 出る前に, 行ったことがある, 来る時, 行くつもり… */
const CLAUSE_NOUNS = new Set(['前', '後', 'こと', '時', 'とき', 'つもり', '予定', 'ため', 'はず', 'ところ', '人']);
const PLAIN_OF_POLITE: [RegExp, string][] = [
  [/(^|\+)masu\+neg\+past$/, '$1nai+past'],
  [/(^|\+)masu\+neg$/, '$1nai'],
  [/(^|\+)masu\+past$/, '$1ta'],
  [/(^|\+)masu$/, ''],
];

/**
 * Polite ます/です inside a clause: before a noun it modifies (出ます前に →
 * 出る前に, 行きましたことがあります → 行ったことがあります) and before でしょう
 * (晴れますでしょう → 晴れるでしょう; でしょうか is left alone: very polite speech uses it).
 */
const politeInClause: Rule = (tokens, lists, p, out) => {
  tokens.forEach((t, i) => {
    const next = tokens[i + 1];
    if (!next) return;
    const beforeNoun = fn(next, 'koto') || words(next).some((a) => CLAUSE_NOUNS.has(a.word) && !a.pos.some((x) => x.startsWith('v')));
    const beforeDeshou = fn(next, 'deshou', 'darou') && !fn(tokens[i + 2], 'ka');
    if (!beforeNoun && !beforeDeshou) return;
    if (beforeDeshou && fn(t, 'desu')) {
      const fix: Fix = { start: t.start, end: t.end, replacement: '' };
      out.push(jaIssue(p, 'polite_in_clause', t.start, next.end, vi.politeInClause(t.surface + next.surface, next.surface, next.surface), fix));
      return;
    }
    for (const a of words(t)) {
      const rule = PLAIN_OF_POLITE.find(([re]) => re.test(tagsOf(a)));
      if (!rule || !tagsOf(a).includes('masu')) continue;
      const plainTags = tagsOf(a).replace(rule[0], rule[1]).replace(/^\+/, '');
      const right = formOf(lists, a.no, plainTags, kanaOnly(t.surface));
      if (!right) continue;
      const fix: Fix = { start: t.start, end: t.end, replacement: right };
      out.push(jaIssue(p, 'polite_in_clause', t.start, t.end, vi.politeInClause(t.surface, right, next.surface), fix));
      return;
    }
  });
};

const RULES: readonly Rule[] = [teForm, adjectiveForm, naAdjectiveForm, whWa, particleKana, aruIru, niDe, counters, counterReading, politeInClause];

/** Runs every rule on a normalized text; issues are in text positions. */
export function runJaRules(text: string, lexicon: JaLexicon, penalties: Penalties): Issue[] {
  const tokens = tokenize(text, lexicon);
  const lists = listsOf(lexicon);
  const out: Issue[] = [];
  for (const rule of RULES) rule(tokens, lists, penalties, out, text, lexicon);
  return out;
}

/** Hiragana of a token (for rules comparing sounds). */
export const tokenKana = (t: Token) => toHiragana(t.surface);
