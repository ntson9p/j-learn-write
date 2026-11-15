import { defineConfig } from 'vitest/config';

// End-to-end tests: run `npm run e2e` (builds the app first). They start
// `vite preview` and drive Chromium through Playwright.
export default defineConfig({
  test: {
    name: 'web-e2e',
    include: ['e2e/**/*.e2e.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
