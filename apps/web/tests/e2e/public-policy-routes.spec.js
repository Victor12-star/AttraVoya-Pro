import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_ACCESSIBILITY_IMPACTS = new Set(['critical', 'serious']);

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
    test(`${route.path} remains publicly reachable and accessible without authentication`, async ({
      page,
    }) => {
      const response = await page.goto(route.path);

      expect(response?.ok()).toBe(true);
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(route.path);

      const accessibility = await new AxeBuilder({ page }).include('main').analyze();
      const blockingViolations = accessibility.violations.filter(({ impact }) =>
        BLOCKING_ACCESSIBILITY_IMPACTS.has(impact),
      );

      expect(blockingViolations).toEqual([]);
    });
  }
});
