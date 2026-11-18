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
import { COUNTERS, counterReadings, naiveCounterReading, numberReading } from './numbers.ts';
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
      const forms = conjugate(spelling, w.reading, cls, false);
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

type WrongForm = { right: string; code: 'te_form' | 'verb_form' | 'adjective_form'; why: string; notAfter?: string };
const wrongVerbCache = new WeakMap<JaLexicon, Map<string, WrongForm>>();
const wrongMaxLength = new WeakMap<Map<string, WrongForm>, number>();

const WHY = {
  masu: 'ます nối với thể ます (bỏ る/う đổi sang cột i), không nối với thể từ điển',
  nagara: 'ながら nối với thể ます bỏ ます',
  nai: 'thể ない của động từ nhóm 1: đổi đuôi sang cột a + ない',
  naiDict: 'ない nối với thể ない, không nối với thể từ điển',
  ichidanTe: 'động từ nhóm 2 chỉ bỏ る rồi thêm て/た',
  sokuon: 'động từ đuôi う, つ, る nhóm 1: って/った',
  voicing: 'đuôi む, ぶ, ぬ: んで/んだ; đuôi く: いて/いた; đuôi ぐ: いで/いだ',
  tari: 'たり nối với thể た',
  potential: 'thể khả năng của động từ nhóm 1: đổi đuôi sang cột e + る',
  stemBefore: 'すぎる, にくい, やすい nối với thể ます bỏ ます',
  teKudasai: 'ください đi sau thể て',
  aru: 'động từ này chia ます thành 〜います',
  imperative: 'mệnh lệnh của động từ nhóm 2: bỏ る thêm ろ',
  causative: 'thể sai khiến của động từ nhóm 1: cột a + せる',
  adjectiveSugi: 'tính từ đuôi い bỏ い rồi mới thêm すぎる',
  adjective: 'tính từ đuôi い bỏ い rồi mới thêm くて, くない, かった',
  adjectiveNaru: 'tính từ đuôi い + なる: bỏ い thêm く',
};

/**
 * Other wrong verb forms learners make, generated from the conjugation of each
 * course verb (never typed by hand), mapped to the right form: dictionary form
 * + ます (起きるます), + ながら (聞くながら); ます-stem + ない (話しない); て-form
 * slips (寝った, 行て, 読んて, 書いで); ます-stem + たり (読みたり). Spellings that
 * are a real word or form are left out.
 */
function wrongVerbForms(lexicon: JaLexicon): Map<string, WrongForm> {
  const cached = wrongVerbCache.get(lexicon);
  if (cached) return cached;
  const map = new Map<string, WrongForm>();
  const add = (wrong: string, right: string | undefined, code: WrongForm['code'], why: string, notAfter?: string) => {
    if (right && wrong !== right && !map.has(wrong)) map.set(wrong, { right, code, why, ...(notAfter ? { notAfter } : {}) });
  };
  for (const w of lexicon.words) {
    const cls = conjClassOf(w.word, w.pos);
    if (cls === 'adj-i') {
      // 安いくて → 安くて, 寒いになりました → 寒くなりました.
      for (const spelling of new Set([w.word, w.reading])) {
        const stem = spelling.slice(0, -1);
        for (const suffix of ['くて', 'くない', 'くなかった', 'かった', 'かったら', 'ければ']) add(spelling + suffix, stem + suffix, 'adjective_form', WHY.adjective);
        for (const naru of ['なる', 'なります', 'なりました', 'なって', 'なった']) add(`${spelling}に${naru}`, `${stem}く${naru}`, 'adjective_form', WHY.adjectiveNaru);
        // 高いすぎます → 高すぎます
        for (const sugi of ['すぎる', 'すぎます', 'すぎました', 'すぎて']) add(spelling + sugi, stem + sugi, 'adjective_form', WHY.adjectiveSugi);
      }
      continue;
    }
    if (!cls || cls.startsWith('adj')) continue;
    const godan = cls.startsWith('v5');
    for (const spelling of new Set([w.word, w.reading])) {
      const forms = conjugate(spelling, w.reading, cls, false);
      const form = (tags: string) => forms.find((f) => f.tags.join('+') === tags)?.surface;
      const dict = form('');
      const stem = form('stem');
      const te = form('te');
      const ta = form('ta');
      if (!dict || !stem || !te || !ta) continue;
      for (const tags of ['masu', 'masu+neg', 'masu+past', 'masu+neg+past']) {
        const right = form(tags);
        if (right) add(dict + right.slice(stem.length), right, 'verb_form', WHY.masu);
      }
      add(`${dict}ながら`, form('nagara'), 'verb_form', WHY.nagara);
      // 食べるすぎました, 読むにくい, 歩くやすい: the ます-stem goes before すぎる, にくい, やすい.
      for (const suffix of ['すぎる', 'すぎます', 'すぎました', 'すぎて', 'にくい', 'にくいです', 'やすい', 'やすいです']) add(dict + suffix, stem + suffix, 'verb_form', WHY.stemBefore);
      // 待ちください → 待ってください (but お待ちください is right: お + stem is left alone by the token check).
      add(`${stem}ください`, `${te}ください`, 'te_form', WHY.teKudasai, 'おご');
      // いらっしゃります → いらっしゃいます
      if (cls === 'v5aru') add(`${dict.slice(0, -1)}ります`, form('masu'), 'verb_form', WHY.aru);
      add(`${te.slice(0, -1)}ながら`, form('nagara'), 'verb_form', WHY.nagara);
      for (const [suffix, tags] of [['ない', 'nai'], ['ないで', 'naide'], ['なかった', 'nai+past'], ['なくて', 'nai+te']] as const) {
        if (godan) add(stem + suffix, form(tags), 'verb_form', WHY.nai);
        add(dict + suffix, form(tags), 'verb_form', WHY.naiDict);
      }
      if (godan) {
        add(`${stem}たり`, form('tari'), 'te_form', WHY.tari);
        add(`${stem}だり`, form('tari'), 'te_form', WHY.tari);
        // 行て, 買た: っ forgotten.
        if (te.endsWith('って')) {
          add(`${te.slice(0, -2)}て`, te, 'te_form', WHY.sokuon);
          add(`${ta.slice(0, -2)}た`, ta, 'te_form', WHY.sokuon);
          add(`${ta.slice(0, -2)}たら`, form('tara'), 'te_form', WHY.sokuon);
        }
        // 話しれます → 話せます: the potential of a group I verb is the え-row + る.
        for (const [suffix, tags] of [['れる', 'potential'], ['れます', 'potential+masu'], ['れません', 'potential+masu+neg']] as const) {
          const right = forms.find((f) => f.tags.join('+') === tags)?.surface ?? conjugate(spelling, w.reading, cls).find((f) => f.tags.join('+') === tags)?.surface;
          add(stem + suffix, right, 'verb_form', WHY.potential);
        }
        // 読んて, 書いで: voicing of て/た.
        const flip: Record<string, string> = { て: 'で', で: 'て', た: 'だ', だ: 'た' };
        if (/[んい][てで]$/u.test(te)) add(te.slice(0, -1) + flip[te.at(-1)!]!, te, 'te_form', WHY.voicing);
        if (/[んい][ただ]$/u.test(ta)) add(ta.slice(0, -1) + flip[ta.at(-1)!]!, ta, 'te_form', WHY.voicing);
      } else if (cls === 'v1') {
        // 寝って, 見った: a group 2 verb conjugated like 帰る.
        add(`${stem}って`, te, 'te_form', WHY.ichidanTe);
        add(`${stem}った`, ta, 'te_form', WHY.ichidanTe);
        // 逃げれ → 逃げろ
        add(`${stem}れ`, form('imperative'), 'verb_form', WHY.imperative);
      }
      if (godan) {
        // 休まさせて → 休ませて: the causative of a group 1 verb is the あ-row + せる.
        const full = conjugate(spelling, w.reading, cls);
        const causative = (tags: string) => full.find((f) => f.tags.join('+') === tags)?.surface;
        const a = causative('causative')?.slice(0, -2);
        if (a) for (const [suffix, tags] of [['させる', 'causative'], ['させて', 'causative+te'], ['させます', 'causative+masu'], ['させました', 'causative+masu+past']] as const) add(a + suffix, causative(tags), 'verb_form', WHY.causative);
      }
    }
  }
  for (const wrong of [...map.keys()]) if (lexicon.analyses(wrong).length > 0) map.delete(wrong);
  wrongVerbCache.set(lexicon, map);
  return map;
}

/** What may follow a wrong verb form written in kana: an ending, a particle or punctuation. */
const AFTER_VERB = /^(ください|います|いる|いました|いません|します|しました|です|でした|も|は|が|を|に|から|ね|よ|か|[、。！？]|$)/u;

/** 起きるます → 起きます, 寝った → 寝た, 読みたり → 読んだり… */
const verbForm: Rule = (tokens, lists, p, out, text, lexicon) => {
  const wrongForms = wrongVerbForms(lexicon);
  let maxLength = wrongMaxLength.get(wrongForms);
  if (maxLength === undefined) {
    maxLength = Math.max(0, ...[...wrongForms.keys()].map((k) => k.length));
    wrongMaxLength.set(wrongForms, maxLength);
  }
  let covered = -1;
  tokens.forEach((t, ti) => {
    const at = t.start;
    if (at < covered) return;
    // A kana-only wrong form must start a word: after punctuation or a particle (きれいくない is not きれ + いくない).
    const prev = tokens[ti - 1];
    const startsWord = !prev || isPunct(prev) || prev.analyses.some((a) => a.kind === 'function') || !kanaOnly(prev.surface) || !kanaOnly(t.surface);
    // The longest wrong form starting at this token.
    for (let len = Math.min(maxLength, text.length - at); len >= 2; len--) {
      const wrong = text.slice(at, at + len);
      const found = wrongForms.get(wrong);
      if (!found || (kanaOnly(wrong) && !startsWord) || (found.notAfter && at > 0 && found.notAfter.includes(text[at - 1]!))) continue;
      const end = at + len;
      // Another rule already explains this part (きれいくない: adjective_form).
      if (out.some((x) => x.start < end && at < x.end)) continue;
      // Not inside a real word (とても is not とて + も), and what follows must not continue a word.
      if (tokens.some((x) => x.start < end && x.end > end && !isUnknown(x))) continue;
      const rest = text.slice(end);
      // A wrong form written with kanji is specific enough (安いくておいしい, 切てもらいました);
      // one in kana only must be followed by an ending, a particle or punctuation.
      if (kanaOnly(wrong) && !AFTER_VERB.test(rest)) continue;
      const fix: Fix = { start: at, end, replacement: found.right };
      out.push(jaIssue(p, found.code, at, end, found.code === 'te_form' ? vi.teForm(wrong, found.right) : found.code === 'adjective_form' ? vi.adjectiveI(wrong, found.right) : vi.verbForm(wrong, found.right, found.why), fix));
      covered = end;
      break;
    }
  });
};

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
      // 食べたいでした, 歩きにくいでした → 食べたかったです, 歩きにくかったです (forms that conjugate like い-adjectives).
      if (!adjI && ['tai', 'yasui', 'nikui'].includes(tagsOf(a)) && fn(next, 'deshita')) {
        const past = formOf(lists, a.no, `${tagsOf(a)}+past`, kanaOnly(t.surface));
        if (past) {
          const fix: Fix = { start: t.start, end: next!.end, replacement: `${past}です` };
          out.push(jaIssue(p, 'adjective_form', t.start, next!.end, vi.adjectiveI(t.surface + next!.surface, `${past}です`), fix));
          return;
        }
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
    ['くなりました', 'になりました'],
    ['くしました', 'にしました'],
    ['くします', 'にします'],
    ['くして', 'にして'],
    ['くする', 'にする'],
    ['くなります', 'になります'],
    ['かったです', 'でした'],
    ['くなって', 'になって'],
    ['くなった', 'になった'],
    ['くなる', 'になる'],
    ['くない', 'じゃない'],
    ['かった', 'でした'],
    ['くて', 'で'],
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
    // 前に, 後に after a clause or an event are times (寝る前に本を読みます), not places;
    // 中 right after a noun is the suffix ちゅう/じゅう (授業中に寝てはいけません).
    if (words(t).some((a) => a.word === '前' || a.word === '後')) return;
    if (fn(t, 'chuu', 'juu') && i > 0 && isNoun(tokens[i - 1])) return;
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
    for (let n = 1; n <= 100; n++) {
      const naive = naiveCounterReading(n, c, true);
      const right = counterReadings(n, c)[0];
      if (naive && right) map.set(naive, right);
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
      // さん after a name or noun is the suffix (田中さんはくに), not the number 3.
      if (naive.startsWith('さん')) {
        const prev = tokens.filter((t) => t.end <= start).at(-1);
        if (prev && !isPunct(prev) && (isNoun(prev) || isName(prev) || isUnknown(prev))) continue;
      }
      out.push(jaIssue(p, 'counter_reading', start, end, vi.counterReading(naive, right), { start, end, replacement: right }));
    }
  }
};

/** Verbs that quote a plain-form clause with と (来ると思います). */
const QUOTE_VERBS = new Set(['思う', '言う', '考える']);
/** Verbs that take an embedded question in plain form (どこにあるか知っていますか). */
const EMBEDDING_VERBS = new Set(['知る', 'わかる', '分かる', '教える', '覚える', '忘れる', '聞く', '調べる', '考える']);
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
    const beforeNoun =
      fn(next, 'koto') ||
      words(next).some((a) => CLAUSE_NOUNS.has(a.word) && !conjClassOf(a.word, a.pos)) ||
      // そうです (hearsay), らしい, みたい, かもしれない, までに, ように (not a wish: 合格しますように。)
      fn(next, 'sou', 'rashii', 'mitai', 'kamoshirenai', 'made') ||
      // ように at the end is a wish (合格しますように。): right.
      (fn(next, 'you') && !(fn(tokens[i + 2], 'ni') && (!tokens[i + 3] || isPunct(tokens[i + 3])))) ||
      // 来ますと思います, 食べましたばかり, 降りますかどうか, ありますか知っていますか
      (fn(next, 'to') && words(tokens[i + 2]).some((a) => QUOTE_VERBS.has(a.word))) ||
      fn(next, 'bakari') ||
      (fn(next, 'ka') && (words(tokens[i + 2]).some((a) => a.word === 'どう') || words(tokens[i + 2]).some((a) => EMBEDDING_VERBS.has(a.word))));
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

const RULES: readonly Rule[] = [teForm, adjectiveForm, naAdjectiveForm, verbForm, whWa, particleKana, aruIru, niDe, counters, counterReading, politeInClause];

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
