import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'course',
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
