/**
 * Matching an answer against the written forms of a model answer, token by
 * token: each token may be written as in the model, in kana (its reading),
 * or with only some of its kanji in kana (昼ごはん for 昼ご飯). The answer
 * does not need to be tokenized, so a correct answer in kana is recognised
 * even where the tokenizer would cut it wrongly (はいしゃ: は + いしゃ, not
 * 歯医者).
 *
 * Accepted with an issue: a particle written as it sounds (わ for は, お for
 * を, え for へ, also inside では/には) and a katakana word in hiragana
 * (てれび, こーひー). Anything else must be exactly one of the token's
 * written forms.
 */
import type { Issue } from '../../core/types.ts';
import { jaIssue } from './issues.ts';
import { isKanji, isKatakana, toHiragana } from './kana.ts';
import type { JaLexicon } from './lexicon.ts';
import { vi } from './messages.ts';
import { tokenize, type Token } from './tokenize.ts';

type Penalties = Readonly<Record<string, number>>;

interface Rendering {
  text: string;
  issue?: { code: 'particle_kana'; char: string; right: string; sound: string; offset: number } | { code: 'kana_script'; right: string };
}

const PARTICLE_SOUND: Record<string, { sound: string; latin: string }> = { は: { sound: 'わ', latin: 'wa' }, を: { sound: 'お', latin: 'o' }, へ: { sound: 'え', latin: 'e' } };
const PUNCT = /[\p{P}\p{S}\s]/u;
const MAX_COMBINATIONS = 16;

/**
 * Spellings of `surface` with each run of kanji written either in kanji or
 * by its part of `reading`: 昼ご飯/ひるごはん → 昼ご飯, ひるご飯, 昼ごはん, ひるごはん.
 * Only the full reading when the kanji runs cannot be matched to the reading.
 */
export function mixedSpellings(surface: string, reading: string): string[] {
  const hira = toHiragana(reading);
  const runs: { text: string; kanji: boolean }[] = [];
  for (const ch of surface) {
    const k = isKanji(ch);
    const last = runs[runs.length - 1];
    if (last && last.kanji === k) last.text += ch;
    else runs.push({ text: ch, kanji: k });
  }
  if (!runs.some((r) => r.kanji)) return [surface];
  const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${runs.map((r) => (r.kanji ? '(.+?)' : escape(toHiragana(r.text)))).join('')}$`, 'u');
  const m = pattern.exec(hira);
  if (!m) return [surface, hira];
  const kanjiReadings = m.slice(1);
  let out = [''];
  let k = 0;
  for (const r of runs) {
    if (r.kanji) {
      const kana = kanjiReadings[k++]!;
      out = out.flatMap((prefix) => [prefix + r.text, prefix + kana]);
    } else out = out.map((prefix) => prefix + r.text);
    if (out.length > MAX_COMBINATIONS) return [surface, hira];
  }
  return [...new Set([surface, ...out, hira])];
}

/** Every accepted way to write a model token. */
function renderings(t: Token, lexicon: JaLexicon): Rendering[] {
  const out = new Map<string, Rendering>();
  const add = (r: Rendering) => {
    const prev = out.get(r.text);
    if (!prev || (prev.issue && !r.issue)) out.set(r.text, r);
  };
  add({ text: t.surface });
  for (const a of t.analyses) {
    if (!('reading' in a)) continue;
    if (a.kind === 'counted' || a.kind === 'number') {
      add({ text: toHiragana(a.reading) });
      continue;
    }
    for (const s of mixedSpellings(t.surface, a.reading)) add({ text: s });
    // The same word in another listed spelling (たばこ / タバコ / 煙草), dictionary form only.
    if (a.kind === 'word' && a.tags.length === 0) {
      const entry = lexicon.words.find((w) => w.no === a.no);
      for (const f of entry?.forms ?? []) add({ text: f });
    }
    // Particles written as they sound: わ for は, also inside では, には.
    if (a.kind === 'function' && (a.role === 'particle' || a.role === 'copula')) {
      [...t.surface].forEach((ch, i) => {
        const p = PARTICLE_SOUND[ch];
        if (!p) return;
        const text = [...t.surface].map((c, j) => (j === i ? p.sound : c)).join('');
        add({ text, issue: { code: 'particle_kana', char: p.sound, right: ch, sound: p.latin, offset: i } });
      });
    }
  }
  // A katakana word in hiragana.
  for (const r of [...out.values()]) {
    if (r.issue || ![...r.text].some(isKatakana)) continue;
    add({ text: toHiragana(r.text), issue: { code: 'kana_script', right: r.text } });
  }
  return [...out.values()];
}

const cache = new WeakMap<JaLexicon, Map<string, Rendering[][]>>();

function modelRenderings(model: string, lexicon: JaLexicon): Rendering[][] {
  let byText = cache.get(lexicon);
  if (!byText) cache.set(lexicon, (byText = new Map()));
  let r = byText.get(model);
  if (!r) {
    r = tokenize(model, lexicon)
      .filter((t) => !t.analyses.every((a) => a.kind === 'punct'))
      .map((t) => renderings(t, lexicon));
    byText.set(model, r);
  }
  return r;
}

const FINAL_PARTICLES = /(?:よね|ね|よ)$/u;

/**
 * Issues when `answer` is a written form of `model` (empty: exactly the model),
 * null when it is not. Positions refer to `answer`. A final ね/よ of the answer
 * is ignored unless the model ends with one.
 */
export function renderedMatch(answer: string, model: string, lexicon: JaLexicon, penalties: Penalties): Issue[] | null {
  // The answer without punctuation; map[i] = position in `answer` (UTF-16, like token positions).
  const map: number[] = [];
  let compact = '';
  for (let i = 0; i < answer.length; i++) {
    // A dot between digits is a decimal point (8.600 is not 8600 in Japanese).
    const decimal = answer[i] === '.' && /\d/.test(answer[i - 1] ?? '') && /\d/.test(answer[i + 1] ?? '');
    if (PUNCT.test(answer[i]!) && !decimal) continue;
    map.push(i);
    compact += answer[i];
  }
  const tokens = modelRenderings(model, lexicon);
  const modelCompact = [...model].filter((c) => !PUNCT.test(c)).join('');
  const tries = [compact];
  if (!FINAL_PARTICLES.test(modelCompact)) {
    const stripped = compact.replace(FINAL_PARTICLES, '');
    if (stripped !== compact && stripped.length > 0) tries.push(stripped);
  }
  for (const text of tries) {
    const found = walk(text, tokens);
    if (!found) continue;
    return found.map(({ at, r }) => {
      const issue = r.issue!;
      if (issue.code === 'particle_kana') {
        const i = at + issue.offset;
        const start = map[i] ?? 0;
        return jaIssue(penalties, 'particle_kana', start, start + 1, vi.particleKana(issue.char, issue.right, issue.sound), { start, end: start + 1, replacement: issue.right });
      }
      const start = map[at] ?? 0;
      const end = (map[at + r.text.length - 1] ?? start) + 1;
      return jaIssue(penalties, 'kana_script', start, end, vi.kanaScript(r.text, issue.right), { start, end, replacement: issue.right });
    });
  }
  return null;
}

/** The renderings, one per token, that spell `text` with the fewest issues (null when none does). */
function walk(text: string, tokens: readonly Rendering[][]): { at: number; r: Rendering }[] | null {
  // best[pos] = choices so far reaching `pos` with the fewest issues.
  let states = new Map<number, { at: number; r: Rendering }[]>([[0, []]]);
  for (const options of tokens) {
    const next = new Map<number, { at: number; r: Rendering }[]>();
    for (const [pos, path] of states) {
      for (const r of options) {
        if (!text.startsWith(r.text, pos)) continue;
        const end = pos + r.text.length;
        const p = r.issue ? [...path, { at: pos, r }] : path;
        const prev = next.get(end);
        if (!prev || p.length < prev.length) next.set(end, p);
      }
    }
    if (next.size === 0) return null;
    states = next;
  }
  return states.get(text.length) ?? null;
}
