import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/app';
import { navigate, syncFromLocation } from '../src/router';
import { T } from '../src/strings';

function go(path: string) {
  navigate(path);
  syncFromLocation();
}

describe('app shell', () => {
  beforeEach(() => go('/'));

  it('shows the bottom navigation with the current tab', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: T.nav.label });
    const links = nav.querySelectorAll('a');
    expect([...links].map((a) => a.textContent)).toEqual([T.nav.learn, T.nav.review, T.nav.dict, T.nav.progress, T.nav.settings]);
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe(T.nav.learn);
    await screen.findByRole('heading', { level: 1, name: T.home.title });
  });

  it('loads pages on demand when the route changes', async () => {
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: T.home.title });
    go('/settings');
    await screen.findByRole('heading', { level: 1, name: T.settings.title });
    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe(T.nav.settings);
    go('/about');
    await screen.findByRole('heading', { level: 1, name: T.about.title });
  });

  it('shows a not-found page for unknown routes', async () => {
    go('/khong-co');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(T.notFound);
  });

  it('switches the theme from the settings page', async () => {
    go('/settings');
    render(<App />);
    const dark = await screen.findByLabelText(T.settings.themeDark);
    fireEvent.click(dark);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    fireEvent.click(screen.getByLabelText(T.settings.themeAuto));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined());
  });
});
