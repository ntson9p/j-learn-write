/**
 * Accessibility checks with axe-core on the main screens of the production
 * build (light and dark themes). Serious and critical violations fail.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { preview, type PreviewServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const appDir = join(__dirname, '..');
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let server: PreviewServer;
let browser: Browser;
let base: string;

beforeAll(async () => {
  server = await preview({ root: appDir, configFile: join(appDir, 'vite.config.ts'), preview: { port: 4181, host: '127.0.0.1' } });
  base = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:4181/';
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await new Promise<void>((resolve) => server?.httpServer.close(() => resolve()));
});

async function audit(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe;
    return axe.run(document, { resultTypes: ['violations'] });
  });
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
}

const PAGES: [string, string][] = [
  ['#/', 'Lộ trình học'],
  ['#/review', ''],
  ['#/settings', 'Cài đặt'],
  ['#/guide', 'Hướng dẫn cài bộ gõ và giọng đọc'],
  ['#/kana', 'Bảng chữ kana'],
  ['#/kana/%E3%81%82', ''],
  ['#/lesson/kana-01', ''],
  ['#/practice/kana-01', ''],
  ['#/quiz/kana-01', ''],
  ['#/lesson/n5-01', ''],
  ['#/word/1305', ''],
  ['#/kanji/%E6%97%A5', ''],
  ['#/grammar/wa', ''],
  ['#/dict', 'Từ điển'],
  ['#/progress', 'Tiến độ'],
  ['#/test/n5', 'Kiểm tra N5'],
  ['#/write', 'Luyện viết'],
  ['#/about', 'Giới thiệu và giấy phép'],
];

describe('accessibility (axe-core)', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`has no serious violations on the main screens (${theme})`, async () => {
      const context = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: theme });
      const page = await context.newPage();
      const problems: string[] = [];
      for (const [hash, heading] of PAGES) {
        await page.goto(`${base}${hash}`);
        await page.locator('h1').first().waitFor();
        if (heading) await page.getByRole('heading', { level: 1, name: heading }).waitFor();
        await page.waitForTimeout(150);
        for (const p of await audit(page)) problems.push(`${hash}: ${p}`);
      }
      await context.close();
      expect(problems).toEqual([]);
    });
  }
});
