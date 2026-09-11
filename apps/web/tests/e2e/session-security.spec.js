import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_ACCESSIBILITY_IMPACTS = new Set(['critical', 'serious']);

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
    await page.route('**/api/v1/auth/sessions*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      expect(request.method()).toBe('GET');
      expect(url.pathname).toBe('/api/v1/auth/sessions');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload),
      });
    });

    const response = await page.goto('/profile');

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { name: 'Sessions & devices', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chrome · Windows' })).toBeVisible();
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
