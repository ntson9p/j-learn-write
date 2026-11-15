import { expandPattern, PatternError } from './patterns';

const LANGS = new Set(['ja']);
const TYPES = new Set(['count', 'model', 'location']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
}

/**
 * Checks a question config (usually parsed JSON) and returns a list of
 * problems; an empty list means the question is valid.
 */
export function validateQuestion(input: unknown): string[] {
  if (!isObject(input)) return ['question must be an object'];
  const q = input;
  const errors: string[] = [];
  const where = isNonEmptyString(q.id) ? q.id : '(no id)';
  const err = (msg: string) => errors.push(`${where}: ${msg}`);

  if (!isNonEmptyString(q.id)) err('"id" must be a non-empty string');
  if (!LANGS.has(q.lang as string)) err(`"lang" must be one of ${[...LANGS].join(', ')}`);
  if (!TYPES.has(q.type as string)) err(`"type" must be one of ${[...TYPES].join(', ')}`);
  if (!isNonEmptyString(q.prompt)) err('"prompt" must be a non-empty string');
  for (const key of ['title', 'promptVi', 'picture'] as const) {
    if (q[key] !== undefined && typeof q[key] !== 'string') err(`"${key}" must be a string`);
  }

  if (q.penalties !== undefined) {
    if (!isObject(q.penalties)) err('"penalties" must be an object');
    else {
      for (const [code, value] of Object.entries(q.penalties)) {
        if (!isScore(value)) err(`penalty "${code}" must be an integer from 0 to 100`);
      }
    }
  }

  if (q.type === 'count') validateCount(q, err);
  if (q.type === 'model') validateModel(q, err);
  if (q.type === 'location') validateLocation(q, err);

  if (q.examples !== undefined) {
    if (!Array.isArray(q.examples)) err('"examples" must be an array');
    else {
      q.examples.forEach((ex, i) => {
        if (!isObject(ex)) {
          err(`example ${i} must be an object`);
          return;
        }
        if (typeof ex.answer !== 'string') err(`example ${i}: "answer" must be a string`);
        if (!isScore(ex.score)) err(`example ${i}: "score" must be an integer from 0 to 100`);
        if (ex.issues !== undefined && !(Array.isArray(ex.issues) && ex.issues.every((c) => typeof c === 'string'))) {
          err(`example ${i}: "issues" must be an array of strings`);
        }
        if (ex.note !== undefined && typeof ex.note !== 'string') err(`example ${i}: "note" must be a string`);
      });
    }
  }
  return errors;
}

function validateCount(q: Record<string, unknown>, err: (msg: string) => void): void {
  const expected = q.expected;
  if (!isObject(expected)) {
    err('"expected" must be an object');
    return;
  }
  const n = expected.number;
  if (!(typeof n === 'number' && Number.isInteger(n) && n >= 0)) err('"expected.number" must be an integer >= 0');
  if (!isNonEmptyString(expected.noun)) err('"expected.noun" must be a non-empty string');
  if (expected.counter !== undefined && !isNonEmptyString(expected.counter)) err('"expected.counter" must be a non-empty string');
  if (expected.modifiers !== undefined) {
    if (!(Array.isArray(expected.modifiers) && expected.modifiers.every(isNonEmptyString))) {
      err('"expected.modifiers" must be an array of non-empty strings');
    }
  }
  if (expected.sentence !== undefined && !isNonEmptyString(expected.sentence)) {
    err('"expected.sentence" must be a non-empty string');
  }
  const options = q.options;
  if (options !== undefined) {
    if (!isObject(options)) err('"options" must be an object');
    else {
      for (const key of ['requireFullSentence', 'allowArabicDigits']) {
        if (options[key] !== undefined && typeof options[key] !== 'boolean') err(`"options.${key}" must be a boolean`);
      }
      if (options.wrongContentScore !== undefined && !isScore(options.wrongContentScore)) {
        err('"options.wrongContentScore" must be an integer from 0 to 100');
      }
    }
  }
}

function validateLocation(q: Record<string, unknown>, err: (msg: string) => void): void {
  const expected = q.expected;
  if (!isObject(expected)) {
    err('"expected" must be an object');
    return;
  }
  if (expected.places !== undefined) {
    if (!(Array.isArray(expected.places) && expected.places.length > 0 && expected.places.every(isNonEmptyString))) {
      err('"expected.places" must be a non-empty array of non-empty strings');
    }
  }
  for (const key of ['position', 'sentence'] as const) {
    if (expected[key] !== undefined && !isNonEmptyString(expected[key])) err(`"expected.${key}" must be a non-empty string`);
  }
  if (expected.position !== undefined && expected.places === undefined) {
    err('"expected.position" needs "expected.places"');
  }
  const options = q.options;
  if (options !== undefined) {
    if (!isObject(options)) err('"options" must be an object');
    else if (options.wrongContentScore !== undefined && !isScore(options.wrongContentScore)) {
      err('"options.wrongContentScore" must be an integer from 0 to 100');
    }
  }
}

function validateModel(q: Record<string, unknown>, err: (msg: string) => void): void {
  const answers = q.answers;
  if (!Array.isArray(answers) || answers.length === 0) {
    err('"answers" must be a non-empty array');
    return;
  }
  answers.forEach((answer, i) => {
    let text: unknown = answer;
    if (isObject(answer)) {
      text = answer.text;
      if (answer.score !== undefined && !isScore(answer.score)) err(`answer ${i}: "score" must be an integer from 0 to 100`);
    }
    if (!isNonEmptyString(text)) {
      err(`answer ${i} must be a non-empty string or { "text": ... }`);
      return;
    }
    try {
      expandPattern(text);
    } catch (e) {
      if (e instanceof PatternError) err(`answer ${i}: ${e.message}`);
      else throw e;
    }
  });
  const options = q.options;
  if (options !== undefined) {
    if (!isObject(options)) err('"options" must be an object');
    else {
      if (options.allowArabicDigits !== undefined && typeof options.allowArabicDigits !== 'boolean') {
        err('"options.allowArabicDigits" must be a boolean');
      }
      const max = options.maxLightEdits;
      if (max !== undefined && !(typeof max === 'number' && Number.isInteger(max) && max >= 0 && max <= 5)) {
        err('"options.maxLightEdits" must be an integer from 0 to 5');
      }
    }
  }
}
