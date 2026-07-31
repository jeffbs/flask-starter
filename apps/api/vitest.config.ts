import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/env.ts'],
    // Alle Suites teilen sich eine Test-DB — sequenziell halten
    fileParallelism: false,
    pool: 'forks',
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
