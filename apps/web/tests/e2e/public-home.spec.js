import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_ACCESSIBILITY_IMPACTS = new Set(['critical', 'serious']);
const SLOW_NETWORK_DELAY_MS = 250;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function collectProductionResourceBaseline(page) {
  return page.evaluate(() => {
    const totals = {
      count: 0,
      decodedBodyBytes: 0,
      encodedBodyBytes: 0,
      transferBytes: 0,
    };
    const byType = Object.fromEntries(
      ['document', 'script', 'style', 'image', 'font', 'other'].map((type) => [
        type,
        {
          count: 0,
          decodedBodyBytes: 0,
          encodedBodyBytes: 0,
          transferBytes: 0,
        },
      ]),
    );

    function classify(pathname, fallbackType) {
      if (/\.js$/i.test(pathname)) return 'script';
      if (/\.css$/i.test(pathname)) return 'style';
      if (/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(pathname)) return 'image';
      if (/\.(?:otf|ttf|woff2?)$/i.test(pathname)) return 'font';
      return fallbackType === 'navigation' ? 'document' : 'other';
    }

    const entries = [
      ...performance.getEntriesByType('navigation'),
      ...performance.getEntriesByType('resource'),
    ];

    for (const entry of entries) {
      const resourceUrl = new URL(entry.name, location.href);
      if (resourceUrl.origin !== location.origin) continue;

      const type = classify(resourceUrl.pathname, entry.entryType);
      const summary = byType[type];
      const decodedBodyBytes = Number.isFinite(entry.decodedBodySize) ? entry.decodedBodySize : 0;
      const encodedBodyBytes = Number.isFinite(entry.encodedBodySize) ? entry.encodedBodySize : 0;
      const transferBytes = Number.isFinite(entry.transferSize) ? entry.transferSize : 0;

      summary.count += 1;
      summary.decodedBodyBytes += decodedBodyBytes;
      summary.encodedBodyBytes += encodedBodyBytes;
      summary.transferBytes += transferBytes;

      totals.count += 1;
      totals.decodedBodyBytes += decodedBodyBytes;
      totals.encodedBodyBytes += encodedBodyBytes;
      totals.transferBytes += transferBytes;
    }

    return { byType, totals };
  });
}

test.describe('public home page', () => {
  test('renders the core public experience', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('a[href="/plan-by-budget"]').first()).toBeVisible();
  });

  test('measures the production mobile resource baseline', async ({ browserName, isMobile, page }) => {
    test.skip(
      browserName !== 'chromium' || !isMobile,
      'Resource baseline is measured once on the Pixel 7 Chromium project.',
    );

    await page.addInitScript(() => performance.setResourceTimingBufferSize(1000));
    const response = await page.goto('/');

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('main')).toBeVisible();

    const baseline = await collectProductionResourceBaseline(page);

    expect(baseline.byType.document.count).toBeGreaterThan(0);
    expect(baseline.byType.script.count).toBeGreaterThan(0);
    expect(baseline.totals.encodedBodyBytes).toBeGreaterThan(0);
    expect(baseline.totals.decodedBodyBytes).toBeGreaterThan(0);

    // Keep CI evidence aggregate-only. Do not print resource URLs, query strings,
    // user identifiers, provider payloads or other request-level information.
    console.log(`Production mobile resource baseline: ${JSON.stringify(baseline)}`);
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

    const response = await page.goto('/plan-by-budget?origin=Stockholm&budget=10000&currency=SEK');

    expect(response?.ok()).toBe(true);
    const plannerForm = page.locator('main form');
    await expect(
      plannerForm.getByRole('textbox', { name: 'Where are you travelling from?' }),
    ).toHaveValue('Stockholm');
    await expect(plannerForm.getByRole('spinbutton', { name: 'Budget' })).toHaveValue('10000');
    await expect(plannerForm.getByRole('combobox', { name: 'Currency' })).toHaveValue('SEK');
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
