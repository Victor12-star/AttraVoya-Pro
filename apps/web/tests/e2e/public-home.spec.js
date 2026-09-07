import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_ACCESSIBILITY_IMPACTS = new Set(['critical', 'serious']);
const SLOW_NETWORK_DELAY_MS = 250;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test.describe('public home page', () => {
  test('renders the core public experience', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('a[href="/plan-by-budget"]').first()).toBeVisible();
  });

  test('renders over a deliberately delayed network', async ({ page }) => {
    await page.route('**/*', async (route) => {
      const resourceType = route.request().resourceType();

      if (['document', 'script', 'stylesheet'].includes(resourceType)) {
        await delay(SLOW_NETWORK_DELAY_MS);
      }

      await route.continue();
    });

    const response = await page.goto('/');

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('recovers navigation after connectivity returns', async ({ context, page }) => {
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();

    await context.setOffline(true);
    let offlineNavigationFailed = false;

    try {
      await page.goto('/plan-by-budget', { waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch {
      offlineNavigationFailed = true;
    } finally {
      await context.setOffline(false);
    }

    expect(offlineNavigationFailed).toBe(true);

    const response = await page.goto(
      '/plan-by-budget?origin=Stockholm&budget=10000&currency=SEK',
    );

    expect(response?.ok()).toBe(true);
    await expect(page.locator('.query-summary')).toContainText('Stockholm');
    await expect(page.locator('.query-summary')).toContainText('10000 SEK');
  });

  test('has no serious or critical automated accessibility violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).include('main').analyze();
    const blockingViolations = results.violations.filter(({ impact }) =>
      BLOCKING_ACCESSIBILITY_IMPACTS.has(impact),
    );

    expect(blockingViolations).toEqual([]);
  });

  test('opens the mobile navigation on mobile viewports', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This interaction is specific to the mobile navigation.');

    await page.goto('/');

    const menuButton = page.getByRole('button', { name: 'Open navigation' });
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await menuButton.click();

    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  });
});
