import { describe, expect, it } from 'vitest';
import { currentPath, href, matchRoute, navigate, syncFromLocation } from '../src/router';
import { resolveRoute, ROUTES } from '../src/routes';

describe('matchRoute', () => {
  it('matches static and parameter segments', () => {
    expect(matchRoute('/', '/')).toEqual({});
    expect(matchRoute('/review', '/review')).toEqual({});
    expect(matchRoute('/lesson/:id', '/lesson/n5-01')).toEqual({ id: 'n5-01' });
    expect(matchRoute('/kanji/:char', '/kanji/%E5%AD%A6')).toEqual({ char: '学' });
  });
  it('rejects other paths', () => {
    expect(matchRoute('/review', '/')).toBeNull();
    expect(matchRoute('/lesson/:id', '/lesson')).toBeNull();
    expect(matchRoute('/lesson/:id', '/lesson/a/b')).toBeNull();
    expect(matchRoute('/word/:id', '/word/%E0%A4%A')).toBeNull();
  });
});

describe('navigation', () => {
  it('writes hash routes and reads them back', () => {
    navigate('/settings');
    expect(location.hash).toBe('#/settings');
    syncFromLocation();
    expect(currentPath.value).toBe('/settings');
    location.hash = 'no-slash';
    syncFromLocation();
    expect(currentPath.value).toBe('/');
    expect(href('/about')).toBe('#/about');
  });

  it('resolves every declared route and nothing else', () => {
    for (const r of ROUTES) {
      const path = r.pattern.replace(/:(\w+)/g, 'x');
      expect(resolveRoute(path)?.route).toBe(r);
    }
    expect(resolveRoute('/nope')).toBeNull();
  });
});
