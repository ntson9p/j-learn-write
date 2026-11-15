export type * from './core/types';
export { expandPattern, PatternError } from './core/patterns';
export { validateQuestion } from './core/validate';
export { segments, type Segment } from './highlight';
export { normalizeJa, type JaNormalized } from './lang/ja/normalize';
export { hasJapanese, hasKanji, isAllKana, isHiragana, isKana, isKanji, isKatakana, toHiragana, toKatakana } from './lang/ja/kana';
export { conjClassOf, conjugate, type ConjClass, type ConjForm } from './lang/ja/conjugate';
export { COUNTERS, counterReadings, findCounter, numberReading, numberValue, type Counter, type CounterGroup } from './lang/ja/numbers';
