import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chooseHanViet, isKnownReading, parseHanvietCsv, parseShinjitai, syllableKey, wordlistReadings, type HanVietSources } from '../src/hanviet';

const SOURCES = join(__dirname, '..', 'sources');
const kanjidic = new Map(
  (JSON.parse(readFileSync(join(SOURCES, 'kanjidic2', 'kanji.json'), 'utf8')) as { char: string; vi: string[] }[]).map((k) => [k.char, k.vi]),
);
const src: HanVietSources = {
  kanjidic,
  wordlist: parseHanvietCsv(readFileSync(join(SOURCES, 'hanviet', 'hanviet.csv'), 'utf8')),
  shinjitai: parseShinjitai(readFileSync(join(SOURCES, 'opencc-jp', 'JPShinjitaiCharacters.txt'), 'utf8')),
  overrides: { 着: 'trước', 楽: 'lạc' },
};

describe('syllableKey', () => {
  it('ignores case, tone mark position and final i/y', () => {
    expect(syllableKey('Hỏa')).toBe(syllableKey('hoả'));
    expect(syllableKey('kỳ')).toBe(syllableKey('kì'));
    expect(syllableKey('Úy')).toBe(syllableKey('uý'));
    expect(syllableKey('học')).not.toBe(syllableKey('hóc'));
    expect(syllableKey('quy')).not.toBe(syllableKey('qui'));
  });
});

describe('Hán Việt choice', () => {
  it('reads the word list through traditional forms', () => {
    expect(wordlistReadings('図', src)).toContain('đồ');
    expect(wordlistReadings('駅', src)).toEqual(['dịch']);
  });

  it('trusts a reading both sources agree on', () => {
    expect(chooseHanViet('学', src)).toMatchObject({ main: 'học', ambiguous: false, basis: 'agreed' });
    expect(chooseHanViet('図', src)).toMatchObject({ main: 'đồ', ambiguous: false });
    expect(chooseHanViet('駅', src)).toMatchObject({ main: 'dịch', ambiguous: false });
  });

  it('flags several common readings', () => {
    const r = chooseHanViet('行', src);
    expect(r.ambiguous).toBe(true);
    expect([r.main, ...r.others]).toEqual(expect.arrayContaining(['hành', 'hàng']));
  });

  it('uses author overrides but keeps them flagged when the sources disagree', () => {
    expect(chooseHanViet('楽', src)).toMatchObject({ main: 'lạc', others: ['nhạc'], ambiguous: true, basis: 'override' });
    // KANJIDIC2 gives 着 the reading "Khán" (of 看): only the override names the right one.
    expect(chooseHanViet('着', src)).toMatchObject({ main: 'trước', ambiguous: true, basis: 'override' });
  });

  it('knows readings from either source', () => {
    expect(isKnownReading('楽', 'nhạc', src)).toBe(true);
    expect(isKnownReading('楽', 'học', src)).toBe(false);
  });
});

describe('Hán Việt special cases', () => {
  it('falls back to KANJIDIC2 alone, flagged', () => {
    const only: HanVietSources = { ...src, wordlist: new Map(), overrides: {} };
    expect(chooseHanViet('学', only)).toMatchObject({ main: 'học', ambiguous: true, basis: 'kanjidic-only' });
  });

  it('marks kokuji with an empty override', () => {
    expect(chooseHanViet('込', { ...src, overrides: { 込: '' } })).toEqual({ main: '', others: [], ambiguous: false, basis: 'override' });
  });
});
