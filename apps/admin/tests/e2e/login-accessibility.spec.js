import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_ACCESSIBILITY_IMPACTS = new Set(['critical', 'serious']);

test.describe('admin sign-in', () => {
  test(
    'renders without serious or critical automated accessibility violations',
    async ({ page }) => {
      const response = await page.goto('/login');

      expect(response?.ok()).toBe(true);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Admin sign in' }),
      ).toBeVisible();

      const accessibility = await new AxeBuilder({ page }).include('main').analyze();
      const blockingViolations = accessibility.violations.filter(({ impact }) =>
        BLOCKING_ACCESSIBILITY_IMPACTS.has(impact),
      );

      expect(blockingViolations).toEqual([]);
    },
  );
});
