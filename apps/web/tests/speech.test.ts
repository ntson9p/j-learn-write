import { describe, expect, it } from 'vitest';
import { japaneseVoices, pickVoice, type VoiceInfo } from '../src/lib/speech';

const v = (name: string, lang: string, localService = true): VoiceInfo => ({ name, lang, voiceURI: name, localService });

describe('speech voices', () => {
  const all = [
    v('Google 日本語', 'ja-JP', false),
    v('Kyoko', 'ja-JP', true),
    v('Generic Japanese', 'ja'),
    v('Tingting', 'zh-CN'),
    v('Samantha', 'en-US'),
    v('Linh', 'vi-VN'),
    v('Java', 'jv-ID'),
  ];

  it('keeps Japanese voices only, ja-JP and local ones first', () => {
    expect(japaneseVoices(all).map((x) => x.name)).toEqual(['Kyoko', 'Google 日本語', 'Generic Japanese']);
    expect(japaneseVoices([v('Underscore', 'ja_JP')]).map((x) => x.name)).toEqual(['Underscore']);
  });

  it('uses the preferred voice when it exists', () => {
    const list = japaneseVoices(all);
    expect(pickVoice(list, 'Generic Japanese')?.name).toBe('Generic Japanese');
    expect(pickVoice(list, 'Gone')?.name).toBe('Kyoko');
    expect(pickVoice([], null)).toBeNull();
  });
});
