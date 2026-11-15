import { describe, expect, it } from 'vitest';
import { conjClassOf, conjugate, type ConjForm } from '../../src/lang/ja/conjugate';

const form = (forms: ConjForm[], ...tags: string[]) => forms.find((f) => f.tags.join('+') === tags.join('+'));
const surfaces = (forms: ConjForm[], ...tagSets: string[][]) => tagSets.map((t) => form(forms, ...t)?.surface);

describe('conjClassOf', () => {
  it('reads JMdict parts of speech', () => {
    expect(conjClassOf('食べる', ['v1', 'vt'])).toBe('v1');
    expect(conjClassOf('行く', ['v5k-s', 'vi'])).toBe('v5k-s');
    expect(conjClassOf('勉強', ['n', 'vs', 'vt'])).toBeNull();
    expect(conjClassOf('コピーする', ['n', 'vs', 'vt'])).toBe('vs-c');
    expect(conjClassOf('きれい', ['adj-na'])).toBeNull();
  });
});

describe('conjugate', () => {
  it('conjugates ichidan verbs', () => {
    const f = conjugate('食べる', 'たべる', 'v1');
    expect(surfaces(f, ['masu'], ['masu', 'neg', 'past'], ['te'], ['ta'], ['nai'], ['nai', 'past'], ['ba'], ['vol'], ['imperative'], ['tai'])).toEqual([
      '食べます', '食べませんでした', '食べて', '食べた', '食べない', '食べなかった', '食べれば', '食べよう', '食べろ', '食べたい',
    ]);
    expect(form(f, 'te')?.reading).toBe('たべて');
    expect(form(f, 'potential', 'masu')?.surface).toBe('食べられます');
    expect(form(f, 'causative', 'te')?.surface).toBe('食べさせて');
  });

  it('conjugates every godan ending', () => {
    const te = (dict: string, cls: Parameters<typeof conjugate>[2]) => form(conjugate(dict, dict, cls), 'te')?.surface;
    expect([te('かう', 'v5u'), te('かく', 'v5k'), te('いく', 'v5k-s'), te('およぐ', 'v5g'), te('はなす', 'v5s'), te('まつ', 'v5t'), te('しぬ', 'v5n'), te('あそぶ', 'v5b'), te('よむ', 'v5m'), te('かえる', 'v5r')]).toEqual([
      'かって', 'かいて', 'いって', 'およいで', 'はなして', 'まって', 'しんで', 'あそんで', 'よんで', 'かえって',
    ]);
    const kaku = conjugate('書く', 'かく', 'v5k');
    expect(surfaces(kaku, ['masu'], ['nai'], ['ba'], ['vol'], ['potential'], ['passive', 'ta'], ['imperative'])).toEqual([
      '書きます', '書かない', '書けば', '書こう', '書ける', '書かれた', '書け',
    ]);
    expect(form(conjugate('買う', 'かう', 'v5u'), 'nai')?.surface).toBe('買わない');
    expect(form(conjugate('飲む', 'のむ', 'v5m'), 'ta')?.reading).toBe('のんだ');
  });

  it('handles the irregular verbs', () => {
    expect(surfaces(conjugate('ある', 'ある', 'v5r-i'), ['nai'], ['nai', 'past'], ['masu'])).toEqual(['ない', 'なかった', 'あります']);
    expect(form(conjugate('ある', 'ある', 'v5r-i'), 'potential')).toBeUndefined();
    expect(surfaces(conjugate('いらっしゃる', 'いらっしゃる', 'v5aru'), ['masu'], ['te'], ['imperative'])).toEqual(['いらっしゃいます', 'いらっしゃって', 'いらっしゃい']);
    expect(surfaces(conjugate('くれる', 'くれる', 'v1-s'), ['imperative'], ['masu'])).toEqual(['くれ', 'くれます']);
    expect(surfaces(conjugate('する', 'する', 'vs-i'), ['masu'], ['nai'], ['te'], ['ba'], ['vol'], ['passive'])).toEqual(['します', 'しない', 'して', 'すれば', 'しよう', 'される']);
    expect(surfaces(conjugate('コピーする', 'コピーする', 'vs-c'), ['masu'], ['potential'])).toEqual(['コピーします', 'コピーできる']);
  });

  it('keeps 来 and follows its reading', () => {
    const f = conjugate('来る', 'くる', 'vk');
    expect(f.map((x) => [x.surface, x.reading]).slice(0, 3)).toEqual([['来る', 'くる'], ['来', 'き'], ['来ます', 'きます']]);
    expect([form(f, 'nai'), form(f, 'te'), form(f, 'ba'), form(f, 'potential')].map((x) => `${x?.surface}/${x?.reading}`)).toEqual([
      '来ない/こない', '来て/きて', '来れば/くれば', '来られる/こられる',
    ]);
    expect(form(conjugate('くる', 'くる', 'vk'), 'masu')?.surface).toBe('きます');
  });

  it('conjugates adjectives', () => {
    const f = conjugate('高い', 'たかい', 'adj-i');
    expect(surfaces(f, ['ku'], ['neg'], ['past'], ['neg', 'past'], ['te'], ['ba'], ['sou'])).toEqual([
      '高く', '高くない', '高かった', '高くなかった', '高くて', '高ければ', '高そう',
    ]);
    expect(surfaces(conjugate('いい', 'いい', 'adj-ix'), [], ['neg'], ['past'])).toEqual(['いい', 'よくない', 'よかった']);
    expect(form(conjugate('いい', 'いい', 'adj-ix'), 'past')?.reading).toBe('よかった');
  });
});
