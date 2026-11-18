/**
 * Build plugin: ships the writing-practice stroke data of the 177 kana and
 * the kanji to learn as strokes/<code point>.json (hanzi-writer format),
 * with the licence texts next to them. The dev server serves the same files.
 *
 * Sources (packages/course/sources): AnimCJK outlines and centre lines
 * (Arphic Public License); for kana strokes that AnimCJK splits into
 * several parts, the parts are joined and the centre line comes from
 * KanjiVG (CC BY-SA 3.0). Joined files say so in their "notice" field, as
 * the Arphic Public License asks for modified files.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { kanaStrokes, partGroups, type CharStrokes } from '../../../packages/course/src/strokes.ts';

export const strokeFile = (ch: string) => `${ch.codePointAt(0)!.toString(16)}.json`;
export const MODIFIED_NOTICE =
  'Modified by j-learn-write (2026-11-15): AnimCJK stroke parts joined into whole strokes; centre lines of joined strokes from KanjiVG (CC BY-SA 3.0, Ulrich Apel). Original: AnimCJK, Arphic Public License.';

const SOURCES = fileURLToPath(new URL('../../../packages/course/sources', import.meta.url));

function readAnim(file: string): Map<string, CharStrokes> {
  return new Map(
    readFileSync(join(SOURCES, 'animcjk', file), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const o = JSON.parse(line) as CharStrokes & { character: string };
        return [o.character, { strokes: o.strokes, medians: o.medians }] as const;
      }),
  );
}

/** Every stroke file and licence text the app ships, by file name. */
export function strokeFiles(): Map<string, string> {
  const files = new Map<string, string>();
  const kvg = JSON.parse(readFileSync(join(SOURCES, 'kanjivg', 'kana-paths.json'), 'utf8')) as Record<string, string[]>;
  for (const [ch, anim] of readAnim('graphicsJaKana.txt')) {
    const joined = partGroups(ch, anim.medians).some((g) => g.length > 1);
    const data = kanaStrokes(ch, anim, kvg[ch]!);
    files.set(strokeFile(ch), JSON.stringify(joined ? { ...data, notice: MODIFIED_NOTICE } : data));
  }
  for (const [ch, anim] of readAnim('graphicsJa.txt')) files.set(strokeFile(ch), JSON.stringify(anim));
  files.set('ARPHICPL.TXT', readFileSync(join(SOURCES, 'animcjk', 'ARPHICPL.TXT'), 'utf8'));
  files.set('ANIMCJK-COPYING.txt', readFileSync(join(SOURCES, 'animcjk', 'COPYING.txt'), 'utf8'));
  files.set('KANJIVG-COPYING.txt', readFileSync(join(SOURCES, 'kanjivg', 'COPYING'), 'utf8'));
  return files;
}

export function strokesPlugin(): Plugin {
  let files: Map<string, string> | undefined;
  const all = () => (files ??= strokeFiles());
  return {
    name: 'j-learn-write:strokes',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = /\/strokes\/([^/?]+)$/.exec(req.url?.split('?')[0] ?? '');
        const data = m ? all().get(m[1]!) : undefined;
        if (!data) return next();
        res.setHeader('Content-Type', m![1]!.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8');
        res.end(data);
      });
    },
    generateBundle() {
      for (const [file, source] of all()) this.emitFile({ type: 'asset', fileName: `strokes/${file}`, source });
    },
  };
}
