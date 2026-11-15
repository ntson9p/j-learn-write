/**
 * Hash router: routes look like #/lesson/n5-01. Hash routes work from any
 * sub-path (GitHub Pages) and offline, without server rewrites.
 */
import { signal } from '@preact/signals';

export type Params = Record<string, string>;

/** Current path without the leading '#', always starting with '/'. */
export const currentPath = signal(readPath());

function readPath(): string {
  if (typeof location === 'undefined') return '/';
  const raw = location.hash.replace(/^#/, '');
  const path = raw.split('?')[0] ?? '';
  return path.startsWith('/') ? path : '/';
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    currentPath.value = readPath();
    window.scrollTo?.(0, 0);
  });
}

/** Goes to a route, e.g. navigate('/review'). */
export function navigate(path: string): void {
  if (readPath() === path) return;
  location.hash = path;
}

/** Link target for an <a href>. */
export function href(path: string): string {
  return `#${path}`;
}

/**
 * Matches "/lesson/:id" against "/lesson/n5-01" and returns { id: "n5-01" },
 * or null. Parameters are URI-decoded.
 */
export function matchRoute(pattern: string, path: string): Params | null {
  const want = pattern.split('/').filter(Boolean);
  const got = path.split('/').filter(Boolean);
  if (want.length !== got.length) return null;
  const params: Params = {};
  for (let i = 0; i < want.length; i++) {
    const w = want[i]!;
    const g = got[i]!;
    if (w.startsWith(':')) {
      try {
        params[w.slice(1)] = decodeURIComponent(g);
      } catch {
        return null;
      }
    } else if (w !== g) return null;
  }
  return params;
}

/** Re-reads location.hash (tests change the hash without a hashchange event). */
export function syncFromLocation(): void {
  currentPath.value = readPath();
}
