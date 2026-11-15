import type { PageLoader } from './components/lazy';
import type { Tab } from './components/nav';
import { matchRoute, type Params } from './router';

export interface RouteDef {
  pattern: string;
  /** Highlighted bottom-navigation tab. */
  tab: Tab | null;
  load: PageLoader;
}

export const ROUTES: readonly RouteDef[] = [
  { pattern: '/', tab: 'learn', load: () => import('./pages/home') },
  { pattern: '/guide', tab: 'settings', load: () => import('./pages/guide') },
  // Sections built in later phases of docs/plan.md show a placeholder until then.
  { pattern: '/review', tab: 'review', load: () => import('./pages/soon') },
  { pattern: '/dict', tab: 'dict', load: () => import('./pages/soon') },
  { pattern: '/progress', tab: 'progress', load: () => import('./pages/soon') },
  { pattern: '/settings', tab: 'settings', load: () => import('./pages/settings') },
  { pattern: '/about', tab: 'settings', load: () => import('./pages/about') },
];

export function resolveRoute(path: string): { route: RouteDef; params: Params } | null {
  for (const route of ROUTES) {
    const params = matchRoute(route.pattern, path);
    if (params) return { route, params };
  }
  return null;
}
