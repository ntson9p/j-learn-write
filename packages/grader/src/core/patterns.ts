/**
 * Compact syntax for writing many accepted answers at once:
 *
 *   [a|b]  exactly one of the alternatives
 *   (x)    optional part
 *
 * Groups can be nested: "[これ(だけ)|この本]は高い" expands to
 * これだけは高い, これは高い, この本は高い.
 *
 * Only ASCII brackets are syntax; every other character is literal text.
 */

export class PatternError extends Error {
  constructor(
    message: string,
    readonly pattern: string,
    readonly index: number,
  ) {
    super(`${message} (at position ${index} in "${pattern}")`);
    this.name = 'PatternError';
  }
}

type PatternNode =
  | { kind: 'text'; value: string }
  | { kind: 'choice'; options: PatternNode[][] }
  | { kind: 'optional'; body: PatternNode[] };

/** Default cap on the number of expansions of one pattern. */
export const MAX_EXPANSIONS = 500;

class Parser {
  private pos = 0;

  constructor(private readonly src: string) {}

  parse(): PatternNode[] {
    const nodes = this.sequence();
    if (this.pos < this.src.length) {
      throw new PatternError(`Unexpected "${this.src[this.pos]}"`, this.src, this.pos);
    }
    return nodes;
  }

  /** Reads nodes until a closing bracket, a "|" or the end of the pattern. */
  private sequence(): PatternNode[] {
    const nodes: PatternNode[] = [];
    let text = '';
    const flush = () => {
      if (text) {
        nodes.push({ kind: 'text', value: text });
        text = '';
      }
    };
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos]!;
      if (ch === ']' || ch === ')' || ch === '|') break;
      if (ch === '[') {
        flush();
        nodes.push(this.choice());
      } else if (ch === '(') {
        flush();
        nodes.push(this.optional());
      } else {
        text += ch;
        this.pos++;
      }
    }
    flush();
    return nodes;
  }

  private choice(): PatternNode {
    const open = this.pos;
    this.pos++; // [
    const options: PatternNode[][] = [this.sequence()];
    while (this.src[this.pos] === '|') {
      this.pos++;
      options.push(this.sequence());
    }
    if (this.src[this.pos] !== ']') {
      throw new PatternError('Missing "]"', this.src, open);
    }
    this.pos++; // ]
    return { kind: 'choice', options };
  }

  private optional(): PatternNode {
    const open = this.pos;
    this.pos++; // (
    const body = this.sequence();
    if (this.src[this.pos] === '|') {
      throw new PatternError('Use [a|b] for alternatives, not (a|b)', this.src, this.pos);
    }
    if (this.src[this.pos] !== ')') {
      throw new PatternError('Missing ")"', this.src, open);
    }
    this.pos++; // )
    return { kind: 'optional', body };
  }
}

function expandSequence(nodes: PatternNode[], limit: number, pattern: string): string[] {
  let results = [''];
  for (const node of nodes) {
    const parts = expandNode(node, limit, pattern);
    const next: string[] = [];
    for (const prefix of results) {
      for (const part of parts) {
        next.push(prefix + part);
      }
    }
    if (next.length > limit) {
      throw new PatternError(`Pattern expands to more than ${limit} answers`, pattern, 0);
    }
    results = next;
  }
  return results;
}

function expandNode(node: PatternNode, limit: number, pattern: string): string[] {
  switch (node.kind) {
    case 'text':
      return [node.value];
    case 'choice':
      return node.options.flatMap((option) => expandSequence(option, limit, pattern));
    case 'optional':
      // The full form first, so the first expansion is the most complete answer.
      return [...expandSequence(node.body, limit, pattern), ''];
  }
}

/**
 * Expands a pattern into every answer it describes, without duplicates and
 * in a stable order (the first result is the most complete form).
 */
export function expandPattern(pattern: string, limit = MAX_EXPANSIONS): string[] {
  const nodes = new Parser(pattern).parse();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of expandSequence(nodes, limit, pattern)) {
    const trimmed = text.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  if (out.length === 0) {
    throw new PatternError('Pattern does not describe any answer', pattern, 0);
  }
  return out;
}
