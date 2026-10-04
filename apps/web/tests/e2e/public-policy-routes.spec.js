import { expect, test } from '@playwright/test';

const PUBLIC_RELEASE_ROUTES = [
  {
    path: '/privacy',
    heading: 'AttraVoya Pro privacy policy',
  },
  {
    path: '/terms',
    heading: 'AttraVoya Pro terms of service',
  },
  {
    path: '/delete-account',
    heading: 'Delete your AttraVoya Pro account',
  },
];

test.describe('public policy and account-control routes', () => {
  for (const route of PUBLIC_RELEASE_ROUTES) {
    test(`${route.path} remains publicly reachable without authentication`, async ({ page }) => {
      const response = await page.goto(route.path);

      expect(response?.ok()).toBe(true);
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(route.path);
    });
  }
});
