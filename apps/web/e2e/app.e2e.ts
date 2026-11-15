/**
 * End-to-end tests against the production build (`npm run e2e` builds first):
 * phone layout, offline start through the service worker, license notices.
 * Set E2E_SCREENSHOTS=<dir> to save screenshots.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices, type Browser, type Page } from 'playwright';
import { preview, type PreviewServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const appDir = join(__dirname, '..');
let server: PreviewServer;
let browser: Browser;
let base: string;

async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env.E2E_SCREENSHOTS;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
}

beforeAll(async () => {
  server = await preview({ root: appDir, configFile: join(appDir, 'vite.config.ts'), preview: { port: 4179, host: '127.0.0.1' } });
  base = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:4179/';
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await new Promise<void>((resolve) => server?.httpServer.close(() => resolve()));
});

describe('app (production build)', () => {
  // Device emulation runs on Chromium (only Chromium is installed): it checks
  // viewport, pixel ratio, touch and user agent, not the WebKit engine itself.
  const SCREENS = ['#/', '#/kana', '#/kana/%E3%81%82', '#/write', '#/write/%E5%AD%A6', '#/review', '#/dict', '#/progress', '#/settings', '#/guide', '#/about'];
  for (const device of ['Pixel 7', 'iPhone 13'] as const) {
    it(`fits a phone screen without horizontal scrolling (${device})`, async () => {
      const { defaultBrowserType: _engine, ...descriptor } = devices[device];
      const context = await browser.newContext(descriptor);
      const page = await context.newPage();
      const overflowing: string[] = [];
      for (const hash of SCREENS) {
        await page.goto(`${base}${hash}`);
        await page.locator('h1').first().waitFor();
        await page.waitForTimeout(100);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 0) overflowing.push(`${hash}: ${overflow}px`);
      }
      expect(overflowing).toEqual([]);
      await page.goto(base);
      await page.getByRole('heading', { level: 1, name: 'Lộ trình học' }).waitFor();
      await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).isVisible()).resolves.toBe(true);
      const name = device.toLowerCase().replace(/\s+/g, '-');
      await shot(page, `home-${name}`);
      await context.close();
    });
  }

  it('starts offline after the first visit', async () => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto(base);
    await page.getByRole('heading', { level: 1, name: 'Lộ trình học' }).waitFor();
    // Wait until the service worker has installed and precached everything.
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      }
      return reg.active?.state;
    });

    await context.setOffline(true);
    await page.reload();
    await page.getByRole('heading', { level: 1, name: 'Lộ trình học' }).waitFor();

    // The guide chunk was never loaded online: it must come from the precache.
    await page.goto(`${base}#/guide`);
    await page.getByRole('heading', { level: 1, name: 'Hướng dẫn cài bộ gõ và giọng đọc' }).waitFor();
    await shot(page, 'guide-offline');
    await context.close();
  });

  it('animates stroke order from the shipped stroke data', async () => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    for (const [ch, strokes] of [['あ', 3], ['ぬ', 2], ['学', 8]] as const) {
      await page.goto(`${base}#/write/${encodeURIComponent(ch)}`);
      // The button is enabled once the character's stroke data has loaded.
      await page.locator('.writer button:not([disabled])', { hasText: 'Xem thứ tự nét' }).waitFor();
      await page.getByRole('button', { name: 'Xem thứ tự nét' }).click();
      // hanzi-writer draws SVG paths per stroke: at least one per stroke.
      await page.waitForFunction((n) => document.querySelectorAll('.writer-box svg path').length >= n, strokes);
      await shot(page, `write-${strokes}-${ch.codePointAt(0)!.toString(16)}`);
    }
    for (const file of ['ARPHICPL.TXT', 'KANJIVG-COPYING.txt', 'ANIMCJK-COPYING.txt']) {
      const res = await fetch(`${base}strokes/${file}`);
      expect(res.ok, file).toBe(true);
    }
    const joined = (await (await fetch(`${base}strokes/3042.json`)).json()) as { strokes: string[]; notice?: string };
    expect(joined.strokes).toHaveLength(3);
    expect(joined.notice).toContain('Modified by j-learn-write');
    await context.close();
  });

  it('accepts strokes drawn along the centre lines, joined kana strokes included', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    for (const ch of ['あ', 'ぬ', 'の', 'す', '学']) {
      await page.goto(`${base}#/write/${encodeURIComponent(ch)}`);
      await page.locator('.writer button:not([disabled])', { hasText: 'Tập viết' }).waitFor();
      const data = (await (await fetch(`${base}strokes/${ch.codePointAt(0)!.toString(16)}.json`)).json()) as { medians: number[][][] };
      await page.getByRole('button', { name: 'Tập viết' }).click();
      await page.waitForTimeout(300);
      const box = (await page.locator('.writer-box svg').boundingBox())!;
      // hanzi-writer: 240px box, 10px padding, 1024-unit glyph box with y up (screen y = 900 - y).
      const scale = 220 / 1024;
      for (const median of data.medians) {
        const pts = median.map(([x, y]) => [box.x + 10 + x! * scale, box.y + 10 + (900 - y!) * scale] as const);
        await page.mouse.move(pts[0]![0], pts[0]![1]);
        await page.mouse.down();
        for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 3 });
        await page.mouse.up();
        await page.waitForTimeout(400);
      }
      await page.locator('.writer .notice').waitFor();
      await expect(page.locator('.writer .notice').textContent(), ch).resolves.toBe('Viết đúng hết các nét!');
    }
    await context.close();
  });

  it('serves the license notices', async () => {
    const res = await fetch(`${base}licenses.txt`);
    expect(res.ok).toBe(true);
    const text = await res.text();
    expect(text).toContain('preact@');
    expect(text).toContain('workbox-core@');
    expect(text).toContain('hanzi-writer@');
  });
});
