// Renders public/icon.svg to the PNG icons of the web manifest.
// Usage: node scripts/make-icons.mjs  (needs Playwright's Chromium and a CJK font)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = readFileSync(join(pub, 'icon.svg'), 'utf8');
// Maskable icons need the motif inside the central 80% circle: draw on a full square.
const maskable = svg.replace('rx="112"', 'rx="0"');

const targets = [
  { file: 'icon-192.png', size: 192, svg },
  { file: 'icon-512.png', size: 512, svg: maskable },
  { file: 'apple-touch-icon.png', size: 180, svg: maskable },
];

const browser = await chromium.launch();
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${t.svg.replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)}</body></html>`);
  await page.screenshot({ path: join(pub, t.file), omitBackground: true });
  await page.close();
  console.log('wrote', t.file);
}
await browser.close();
