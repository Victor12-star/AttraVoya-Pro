import { defineConfig, devices } from '@playwright/test';

const isContinuousIntegration = Boolean(process.env.CI);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3001';

export default defineConfig({
  expect: {
    timeout: 10000,
  },
  forbidOnly: isContinuousIntegration,
  fullyParallel: true,
  outputDir: 'test-results',
  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
    {
      name: 'firefox',
      use: devices['Desktop Firefox'],
    },
    {
      name: 'webkit',
      use: devices['Desktop Safari'],
    },
    {
      name: 'mobile-chromium',
      use: devices['Pixel 7'],
    },
  ],
  reporter: isContinuousIntegration
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  // Retrying only in CI helps distinguish infrastructure noise without hiding
  // locally reproducible failures during normal development.
  retries: isContinuousIntegration ? 2 : 0,
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    reuseExistingServer: !isContinuousIntegration,
    stderr: 'pipe',
    stdout: 'pipe',
    timeout: 120000,
    url: baseURL,
  },
  workers: isContinuousIntegration ? 2 : undefined,
});
