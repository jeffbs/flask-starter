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
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Reiner Prozess-Einstieg (listen + exit) — kein testbarer Code
      exclude: ['src/server.ts'],
      thresholds: {
        statements: 98,
        lines: 98,
        functions: 98,
        branches: 92,
      },
    },
  },
});
