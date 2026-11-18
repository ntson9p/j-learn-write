import { describe, expect, it } from 'vitest';
import { validateQuestion } from '../../src/core/validate';

const base = { id: 'q1', lang: 'ja', prompt: '猫はどこにいますか。' };

describe('validateQuestion', () => {
  it('accepts valid questions of every type', () => {
    expect(validateQuestion({ ...base, type: 'count', expected: { number: 3, noun: '鉛筆', counter: '本' } })).toEqual([]);
    expect(validateQuestion({ ...base, type: 'model', answers: ['(私は)ベトナム人です'] })).toEqual([]);
    expect(validateQuestion({ ...base, type: 'location', expected: { places: ['机'], position: '上' } })).toEqual([]);
    expect(validateQuestion({ ...base, type: 'location', expected: { sentence: '家で食べます。' } })).toEqual([]);
  });

  it('reports problems with their question id', () => {
    expect(validateQuestion('nope')).toEqual(['question must be an object']);
    expect(validateQuestion({ ...base, lang: 'zh', type: 'model', answers: ['はい'] })).toEqual(['q1: "lang" must be one of ja']);
    expect(validateQuestion({ ...base, type: 'quiz' })).toEqual(['q1: "type" must be one of count, model, location']);
    expect(validateQuestion({ ...base, type: 'count', expected: { number: -1, noun: '', counter: '' } })).toEqual([
      'q1: "expected.number" must be an integer >= 0',
      'q1: "expected.noun" must be a non-empty string',
      'q1: "expected.counter" must be a non-empty string',
    ]);
    expect(validateQuestion({ ...base, type: 'count', expected: { number: 1, noun: '鉛筆', modifiers: [''] } })).toEqual([
      'q1: "expected.modifiers" must be an array of non-empty strings',
    ]);
  });

  it('checks location questions', () => {
    expect(validateQuestion({ ...base, type: 'location' })).toEqual(['q1: "expected" must be an object']);
    expect(validateQuestion({ ...base, type: 'location', expected: { places: [] } })).toEqual([
      'q1: "expected.places" must be a non-empty array of non-empty strings',
    ]);
    expect(validateQuestion({ ...base, type: 'location', expected: { position: '上' } })).toEqual([
      'q1: "expected.position" needs "expected.places"',
    ]);
    expect(
      validateQuestion({ ...base, type: 'location', expected: { places: ['机'] }, options: { wrongContentScore: 120 } }),
    ).toEqual(['q1: "options.wrongContentScore" must be an integer from 0 to 100']);
  });

  it('checks model answer patterns', () => {
    const errors = validateQuestion({ ...base, type: 'model', answers: ['[これ|それはりんごです'] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Missing "]"');
  });

  it('checks examples', () => {
    expect(
      validateQuestion({
        ...base,
        type: 'count',
        expected: { number: 3, noun: '鉛筆' },
        examples: [{ answer: '三本です', score: 101 }],
      }),
    ).toEqual(['q1: example 0: "score" must be an integer from 0 to 100']);
  });
});
