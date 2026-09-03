import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    allowOnly: false,
    clearMocks: true,
    environment: 'node',
    // Database tests run in one file at a time so migrations, transactions,
    // and cleanup cannot race against another test file.
    fileParallelism: false,
    globals: false,
    hookTimeout: 30_000,
    include: ['src/**/*.{test,spec}.js', 'tests/**/*.{test,spec}.js'],
    exclude: ['node_modules/**', 'coverage/**'],
    restoreMocks: true,
    testTimeout: 30_000,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/**/*.spec.js'],
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
