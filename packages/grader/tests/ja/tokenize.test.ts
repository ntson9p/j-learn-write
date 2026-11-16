import { describe, expect, it } from 'vitest';
import { tokenize, type Token } from '../../src/lang/ja/tokenize';
import { courseLexicon } from '../../src/lang/ja/words';

const lex = courseLexicon([{ ja: 'グエン', reading: 'グエン' }, { ja: 'ベトナム', reading: 'ベトナム' }]);
const surfaces = (text: string) => tokenize(text, lex).map((t) => t.surface);
const kinds = (t: Token) => [...new Set(t.analyses.map((a) => a.kind))].join('|');

describe('tokenize', () => {
  it('splits simple sentences into words and particles', () => {
    expect(surfaces('私は学生です。')).toEqual(['私', 'は', '学生', 'です', '。']);
    expect(surfaces('わたしはがくせいです')).toEqual(['わたし', 'は', 'がくせい', 'です']);
    expect(surfaces('毎朝パンを食べます。')).toEqual(['毎朝', 'パン', 'を', '食べます', '。']);
  });

  it('recognises conjugated forms with their tags and readings', () => {
    const t = tokenize('昨日は映画を見ませんでした。', lex).find((x) => x.surface === '見ませんでした')!;
    expect(t.analyses).toContainEqual(expect.objectContaining({ kind: 'word', word: '見る', reading: 'みませんでした', tags: ['masu', 'neg', 'past'] }));
    const te = tokenize('行ってきます', lex);
    expect(te.map((x) => x.surface)).toEqual(['行って', 'きます']);
  });

  it('keeps every analysis of an ambiguous surface', () => {
    const t = tokenize('雨が降ります', lex).find((x) => x.surface === '降ります')!;
    expect(t.analyses.map((a) => (a.kind === 'word' ? `${a.word}:${a.reading}` : a.kind)).sort()).toEqual(['降りる:おります', '降る:ふります']);
  });

  it('reads the N4 auxiliaries and contractions as one token', () => {
    expect(surfaces('雨が降るかもしれません。')).toEqual(['雨', 'が', '降る', 'かもしれません', '。']);
    expect(surfaces('暇だったら、来てください。')).toEqual(['暇', 'だったら', '、', '来て', 'ください', '。']);
    expect(surfaces('一日おきに運動します。')).toEqual(['一日', 'おきに', '運動', 'します', '。']);
    expect(surfaces('財布を忘れちゃった。')).toEqual(['財布', 'を', '忘れちゃった', '。']);
    expect(surfaces('このペンは書きやすいです。')).toEqual(['この', 'ペン', 'は', '書きやすい', 'です', '。']);
    expect(tokenize('忘れないように', lex).find((t) => t.surface === 'よう')!.analyses).toContainEqual(expect.objectContaining({ kind: 'function', id: 'you' }));
  });

  it('reads けが, よさそう, なさそう, だそう, によると, 〜なくなる', () => {
    expect(surfaces('足にけがをしました')).toEqual(['足', 'に', 'けが', 'を', 'しました']);
    expect(surfaces('この映画はよさそうです')).toContain('よさそう');
    expect(surfaces('時間がなさそうです')).toContain('なさそう');
    expect(surfaces('天気予報によると、雨だそうです')).toEqual(['天気予報', 'によると', '、', '雨', 'だそう', 'です']);
    expect(surfaces('テレビを見なくなりました')).toEqual(['テレビ', 'を', '見なく', 'なりました']);
  });

  it('reads しに as する + に, not as 死ぬ', () => {
    expect(surfaces('何をしに行きますか')).toEqual(['何', 'を', 'し', 'に', '行きます', 'か']);
  });

  it('reads numbers and counters', () => {
    const t = tokenize('鉛筆が三本あります。', lex);
    expect(t.map((x) => x.surface)).toEqual(['鉛筆', 'が', '三本', 'あります', '。']);
    expect(t[2]!.analyses).toEqual([{ kind: 'counted', value: 3, counter: '本', reading: 'さんぼん' }]);
    expect(tokenize('りんごがみっつ', lex).at(-1)!.analyses).toContainEqual({ kind: 'counted', value: 3, counter: 'つ', reading: 'みっつ' });
    expect(tokenize('何人いますか', lex)[0]).toMatchObject({ surface: '何人', analyses: [{ kind: 'counted', value: null, counter: '人', reading: 'なんにん' }] });
    expect(tokenize('2026年', lex)[0]).toMatchObject({ surface: '2026年' });
  });

  it('reads numbers above 10 in kana, and digits with a counter in kana', () => {
    const counted = (text: string) => tokenize(text, lex).find((t) => t.analyses.some((a) => a.kind === 'counted'))?.analyses.find((a) => a.kind === 'counted');
    expect(counted('じゅういちじにねました')).toMatchObject({ value: 11, counter: '時' });
    expect(counted('さんじゅうごさいです')).toMatchObject({ value: 35, counter: '歳' });
    expect(counted('はっせんろっぴゃくえんです')).toMatchObject({ value: 8600, counter: '円' });
    expect(counted('はつかです')).toMatchObject({ value: 20, counter: '日' });
    expect(counted('35さいです')).toMatchObject({ value: 35, counter: '歳' });
    expect(counted('10ぷんです')).toMatchObject({ value: 10, counter: '分' });
    // さん + は stays さん + は (not 3杯).
    expect(surfaces('田中さんの妹さんはいくつですか')).toContain('いくつ');
  });

  it('reads numbers with digit groups and kanji units', () => {
    expect(tokenize('30,000円です', lex)[0]).toMatchObject({ surface: '30,000円', analyses: [{ kind: 'counted', value: 30000, counter: '円' }] });
    expect(tokenize('3万円です', lex)[0]).toMatchObject({ surface: '3万円', analyses: [{ kind: 'counted', value: 30000, counter: '円', reading: 'さんまんえん' }] });
  });

  it('prefers whole words to stems and kana spellings when the costs tie', () => {
    expect(tokenize('家の近くに公園があります', lex).map((x) => x.surface)).toEqual(['家', 'の', '近く', 'に', '公園', 'が', 'あります']);
    expect(tokenize('30人くらいいます', lex).map((x) => x.surface)).toEqual(['30人', 'くらい', 'います']);
    expect(tokenize('安いと', lex).map((x) => x.surface)).toEqual(['安い', 'と']);
  });

  it('knows names and keeps unknown stretches together', () => {
    const t = tokenize('グエンさんはベトナム人です', lex);
    expect(t.map((x) => x.surface)).toEqual(['グエン', 'さん', 'は', 'ベトナム', '人', 'です']);
    expect(kinds(t[0]!)).toBe('name');
    const u = tokenize('私はＸＹＺです', lex);
    expect(u.map((x) => x.surface)).toEqual(['私', 'は', 'ＸＹＺ', 'です']);
    expect(kinds(u[2]!)).toBe('unknown');
    // は is the topic particle and also 歯 (tooth) and 葉 (leaf) written in kana: every analysis is kept.
    expect(u[1]!.analyses.map((a) => (a.kind === 'word' ? a.word : a.kind)).sort()).toEqual(['function', '歯', '葉']);
  });
});
