import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Reine Logik-Module — UI-Komponenten/Screens laufen über RN-Runtime
      // und werden per E2E (Maestro, Stufe 2) abgedeckt, nicht per Unit-Test.
      include: ['src/api.ts', 'src/format.ts'],
      thresholds: {
        statements: 98,
        lines: 98,
        functions: 98,
        branches: 92,
      },
    },
  },
});
