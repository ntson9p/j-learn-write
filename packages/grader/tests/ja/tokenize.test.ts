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

  it('reads numbers and counters', () => {
    const t = tokenize('鉛筆が三本あります。', lex);
    expect(t.map((x) => x.surface)).toEqual(['鉛筆', 'が', '三本', 'あります', '。']);
    expect(t[2]!.analyses).toEqual([{ kind: 'counted', value: 3, counter: '本', reading: 'さんぼん' }]);
    expect(tokenize('りんごがみっつ', lex).at(-1)!.analyses).toContainEqual({ kind: 'counted', value: 3, counter: 'つ', reading: 'みっつ' });
    expect(tokenize('何人いますか', lex)[0]).toMatchObject({ surface: '何人', analyses: [{ kind: 'counted', value: null, counter: '人', reading: 'なんにん' }] });
    expect(tokenize('2026年', lex)[0]).toMatchObject({ surface: '2026年' });
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
