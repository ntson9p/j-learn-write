/** kuromoji (IPADIC) for tests and authoring tools only: an independent check of readings and conjugations. */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

export interface KToken {
  surface_form: string;
  basic_form: string;
  reading?: string;
  pos: string;
  conjugated_type: string;
  conjugated_form: string;
}
export interface KTokenizer {
  tokenize(text: string): KToken[];
}

const require = createRequire(import.meta.url);
let pending: Promise<KTokenizer> | undefined;

export function kuromojiTokenizer(): Promise<KTokenizer> {
  pending ??= new Promise((resolve, reject) => {
    const kuromoji = require('kuromoji') as {
      builder(o: { dicPath: string }): { build(cb: (err: unknown, t: KTokenizer) => void): void };
    };
    const dicPath = join(dirname(require.resolve('kuromoji/package.json')), 'dict');
    kuromoji.builder({ dicPath }).build((err, t) => (err ? reject(err) : resolve(t)));
  });
  return pending;
}

/** Katakana → hiragana. */
export const hira = (s: string) => [...s].map((c) => (c >= 'ァ' && c <= 'ヶ' ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c)).join('');
