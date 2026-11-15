/**
 * End-to-end tests against the production build (`npm run e2e` builds first):
 * phone layout, offline start through the service worker, license notices.
 * Set E2E_SCREENSHOTS=<dir> to save screenshots.
 */
import { mkdirSync, readFileSync } from 'node:fs';
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
  const SCREENS = ['#/', '#/kana', '#/kana/%E3%81%82', '#/lesson/kana-01', '#/practice/kana-01', '#/quiz/kana-01', '#/lesson/n5-01', '#/word/1305', '#/kanji/%E6%97%A5', '#/grammar/wa', '#/write', '#/write/%E5%AD%A6', '#/review', '#/dict', '#/progress', '#/settings', '#/guide', '#/about'];
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

  it('completes a kana lesson: practice, then a quiz passed at 80% or more', async () => {
    type Ex = { id: string; type: string; promptVi?: string; vi?: string; options?: string[]; answer?: number; answers?: string[] };
    const lesson = JSON.parse(readFileSync(join(appDir, '../../packages/course/data/lessons/kana/01.json'), 'utf8')) as { exercises: Ex[] };
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`${base}#/lesson/kana-01`);
    await page.getByRole('link', { name: 'Làm bài tập' }).click();
    // Practice: answer every item (right or wrong) until the summary.
    for (let i = 0; i < 40 && !(await page.getByText(/Hoàn thành: đúng/).count()); i++) {
      const ex = page.locator('.exercise');
      const type = await ex.getAttribute('data-type');
      if (type === 'choice') await ex.locator('.option').first().click();
      else if (type === 'order') {
        while (await ex.locator('.tile-pool .tile').count()) await ex.locator('.tile-pool .tile').first().click();
        await ex.getByRole('button', { name: 'Kiểm tra' }).click();
      } else if (type === 'match') {
        const left = ex.locator('.match-col').first().locator('.option');
        const right = ex.locator('.match-col').nth(1).locator('.option');
        for (let k = 0; k < (await left.count()); k++) {
          for (let j = 0; j < (await right.count()); j++) {
            if (await left.nth(k).isDisabled()) break;
            await left.nth(k).click();
            if (!(await right.nth(j).isDisabled())) await right.nth(j).click();
          }
        }
      }
      await page.locator('.feedback').waitFor();
      await page.getByRole('button', { name: 'Tiếp tục' }).click();
      await page.locator('.feedback').waitFor({ state: 'detached' });
    }
    await page.getByText(/Hoàn thành: đúng \d+\/\d+ câu/).waitFor();

    // Quiz: answer right, using the lesson data.
    await page.getByRole('link', { name: 'Làm bài kiểm tra cuối bài' }).click();
    await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click();
    while (!(await page.getByTestId('quiz-result').count())) {
      const ex = page.locator('.exercise');
      const prompt = ((await ex.locator('.ex-prompt').textContent()) ?? '').trim();
      const data = lesson.exercises.find((e) => (e.promptVi ?? e.vi) === prompt)!;
      expect(data, prompt).toBeDefined();
      if (data.type === 'choice') await ex.getByRole('radio', { name: data.options![data.answer!], exact: true }).click();
      else if (data.type === 'order') {
        for (const ch of data.answers![0]!) await ex.locator('.tile-pool .tile', { hasText: ch }).first().click();
        await ex.getByRole('button', { name: 'Kiểm tra' }).click();
      } else throw new Error(`unexpected quiz exercise ${data.id}`);
      await expect(page.locator('.feedback').textContent(), data.id).resolves.toContain('Chính xác!');
      await page.getByRole('button', { name: 'Tiếp tục' }).click();
      // The next exercise, or the result once the score is saved.
      await page.locator('.feedback').waitFor({ state: 'detached' });
    }
    await expect(page.getByTestId('quiz-result').textContent()).resolves.toContain('Điểm của bạn: 100/100');
    await shot(page, 'quiz-kana-01');

    await page.goto(base);
    // Progress loads after the first render.
    await page.locator('.lesson-item').first().locator('.state-badge', { hasText: 'Đã xong' }).waitFor();
    expect(errors).toEqual([]);
    await context.close();
  });

  it('adds a lesson\'s words and kanji to review, then reviews a card', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}#/lesson/n5-01`);
    await page.getByRole('button', { name: 'Thêm từ và kanji của bài vào thẻ ôn tập' }).click();
    await page.getByText(/Đã thêm 22 thẻ vào ôn tập/).waitFor();
    await page.getByRole('link', { name: 'Bắt đầu ôn' }).click();
    await page.getByText(/thẻ mới hôm nay/).waitFor();
    await page.getByRole('button', { name: 'Bắt đầu ôn' }).click();
    // Cards come in course order: 私 first (its content loads after the card).
    await page.getByTestId('flashcard').getByText('私', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xem đáp án' }).click();
    await page.getByTestId('flashcard').getByText('tôi', { exact: true }).waitFor();
    await shot(page, 'review-card');
    await page.getByRole('button', { name: /^Được/ }).click();
    // The next card (あなた) replaces it once the answer is saved.
    await page.getByTestId('flashcard').getByText('あなた').waitFor();
    // Dictionary: romaji finds the word, its page shows meaning and kanji links.
    await page.goto(`${base}#/dict`);
    await page.getByRole('searchbox').fill('gakusei');
    await page.locator('.dict-list a', { hasText: '学生' }).first().click();
    await page.getByRole('heading', { level: 2, name: 'Nghĩa' }).waitFor();
    await expect(page.locator('main').textContent()).resolves.toContain('học sinh');
    expect(errors).toEqual([]);
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
