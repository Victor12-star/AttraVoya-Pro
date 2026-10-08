import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_ACCESSIBILITY_IMPACTS = new Set(['critical', 'serious']);

test.describe('admin dashboard', () => {
  test('renders without serious or critical automated accessibility violations', async ({
    page,
  }) => {
    const response = await page.goto('/dashboard');

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: 'Administration' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).analyze();
    const blockingViolations = accessibility.violations.filter(({ impact }) =>
      BLOCKING_ACCESSIBILITY_IMPACTS.has(impact),
    );

    expect(blockingViolations).toEqual([]);
  });
});
