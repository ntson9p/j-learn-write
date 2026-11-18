import { defineConfig } from 'vitest/config';

// Each workspace has its own vitest.config.ts; this file runs them all.
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
  },
});
