import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_ACCESSIBILITY_IMPACTS = new Set(['critical', 'serious']);

test.describe('admin dashboard access', () => {
  test('redirects anonymous visitors to accessible sign-in', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole('heading', { level: 1, name: 'Admin sign in' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toHaveCount(0);

    const accessibility = await new AxeBuilder({ page }).include('main').analyze();
    const blockingViolations = accessibility.violations.filter(({ impact }) =>
      BLOCKING_ACCESSIBILITY_IMPACTS.has(impact),
    );
    expect(blockingViolations).toEqual([]);
  });
});
