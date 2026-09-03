import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    allowOnly: false,
    clearMocks: true,
    environment: 'node',
    // Explicit imports keep test-only globals out of production assumptions.
    globals: false,
    hookTimeout: 10_000,
    include: ['src/**/*.{test,spec}.js'],
    exclude: ['node_modules/**', 'coverage/**', 'dist/**'],
    restoreMocks: true,
    testTimeout: 10_000,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/server.js', 'src/tests/**'],
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
