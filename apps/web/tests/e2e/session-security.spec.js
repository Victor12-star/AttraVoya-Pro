import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_ACCESSIBILITY_IMPACTS = new Set(['critical', 'serious']);
const WEB_ORIGIN = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').origin;

const sessionPayload = {
  sessions: [
    {
      id: 'session-e2e',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152.0.0.0 Safari/537.36',
      createdAt: '2026-09-10T10:00:00.000Z',
      lastUsedAt: '2026-09-11T10:30:00.000Z',
      expiresAt: '2026-10-10T10:00:00.000Z',
      refreshTokenHash: 'must-not-render',
      ipHash: 'must-not-render',
    },
  ],
};

test.describe('profile session security', () => {
  test('renders a private session-management experience without serious accessibility issues', async ({
    page,
  }) => {
    const sessionRequests = [];
    const failedRequests = [];
    const pageErrors = [];
    const consoleErrors = [];
    let routeHits = 0;

    page.on('request', (request) => {
      if (request.url().includes('/api/v1/auth/sessions')) {
        sessionRequests.push({ method: request.method(), url: request.url() });
      }
    });
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/v1/auth/sessions')) {
        failedRequests.push({
          method: request.method(),
          url: request.url(),
          failure: request.failure()?.errorText ?? null,
        });
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.route('**/api/v1/auth/sessions*', async (route) => {
      routeHits += 1;
      const request = route.request();
      const url = new URL(request.url());
      expect(request.method()).toBe('GET');
      expect(url.pathname).toBe('/api/v1/auth/sessions');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': WEB_ORIGIN,
          'Cache-Control': 'private, no-store',
          Vary: 'Origin',
        },
        body: JSON.stringify(sessionPayload),
      });
    });

    const response = await page.goto('/profile');

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { name: 'Sessions & devices', level: 1 })).toBeVisible();
    try {
      await expect(page.getByRole('heading', { name: 'Chrome · Windows' })).toBeVisible();
    } catch (error) {
      throw new Error(
        `Session card did not render. diagnostics=${JSON.stringify({
          routeHits,
          sessionRequests,
          failedRequests,
          pageErrors,
          consoleErrors,
          currentUrl: page.url(),
        })}`,
        { cause: error },
      );
    }
    await expect(page.getByText('must-not-render')).toHaveCount(0);
    await expect(page.getByText(/Mozilla\/5\.0/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Revoke session: Chrome · Windows' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out everywhere' })).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).analyze();
    const blocking = accessibility.violations.filter((violation) =>
      BLOCKING_ACCESSIBILITY_IMPACTS.has(violation.impact),
    );
    expect(blocking).toEqual([]);
  });
});
