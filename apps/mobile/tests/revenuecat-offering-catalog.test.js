import { describe, expect, it, jest } from '@jest/globals';

import {
  loadRevenueCatOfferingCatalog,
  normalizeRevenueCatOfferingCatalog,
} from '../src/services/revenuecat-offering-catalog.js';

describe('RevenueCat offering catalog', () => {
  it('returns only monthly and yearly display prices from the current offering', () => {
    const catalog = normalizeRevenueCatOfferingCatalog({
      current: {
        identifier: 'must-not-leak',
        monthly: {
          identifier: '$rc_monthly',
          packageType: 'MONTHLY',
          product: { identifier: 'secret-product-month', priceString: 'SEK 49.00' },
        },
        annual: {
          identifier: '$rc_annual',
          packageType: 'ANNUAL',
          product: { identifier: 'secret-product-year', priceString: 'SEK 399.00' },
        },
      },
    });

    expect(catalog).toEqual([
      { period: 'monthly', price: 'SEK 49.00' },
      { period: 'yearly', price: 'SEK 399.00' },
    ]);
    expect(JSON.stringify(catalog)).not.toContain('secret-product');
    expect(JSON.stringify(catalog)).not.toContain('must-not-leak');
  });

  it('fails closed on malformed package shapes instead of inventing prices', () => {
    expect(
      normalizeRevenueCatOfferingCatalog({
        current: {
          monthly: { packageType: 'ANNUAL', product: { priceString: 'SEK 49.00' } },
          annual: { packageType: 'ANNUAL', product: { priceString: '' } },
        },
      }),
    ).toEqual([]);
  });

  it('stays inert when the Android RevenueCat session is disabled', async () => {
    const session = {
      syncAuthenticatedUser: jest.fn(async () => ({ status: 'disabled' })),
    };
    const purchases = { getOfferings: jest.fn() };

    await expect(loadRevenueCatOfferingCatalog({ session, purchases })).resolves.toEqual([]);
    expect(purchases.getOfferings).not.toHaveBeenCalled();
  });

  it('loads offerings only after the identified session is ready', async () => {
    const events = [];
    const session = {
      syncAuthenticatedUser: jest.fn(async () => {
        events.push('session');
        return { status: 'ready' };
      }),
    };
    const purchases = {
      getOfferings: jest.fn(async () => {
        events.push('offerings');
        return {
          current: {
            monthly: {
              packageType: 'MONTHLY',
              product: { priceString: '€4.99' },
            },
            annual: null,
          },
        };
      }),
    };

    await expect(loadRevenueCatOfferingCatalog({ session, purchases })).resolves.toEqual([
      { period: 'monthly', price: '€4.99' },
    ]);
    expect(events).toEqual(['session', 'offerings']);
  });
});
