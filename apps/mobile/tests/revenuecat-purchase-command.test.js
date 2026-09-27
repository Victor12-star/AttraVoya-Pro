import { describe, expect, it, jest } from '@jest/globals';

import { executeRevenueCatPurchase } from '../src/services/revenuecat-purchase-command.js';

function createDependencies(overrides = {}) {
  const monthly = { identifier: '$rc_monthly', packageType: 'MONTHLY' };
  const annual = { identifier: '$rc_annual', packageType: 'ANNUAL' };
  return {
    monthly,
    annual,
    session: {
      syncAuthenticatedUser: jest.fn(async () => ({ status: 'ready' })),
      ...overrides.session,
    },
    purchases: {
      getOfferings: jest.fn(async () => ({
        current: { monthly, annual },
        all: {},
      })),
      purchasePackage: jest.fn(async () => ({
        customerInfo: { entitlements: { active: { pro: { shouldNotBeTrusted: true } } } },
      })),
      ...overrides.purchases,
    },
  };
}

describe('RevenueCat purchase command', () => {
  it('purchases the requested monthly package without returning CustomerInfo', async () => {
    const { session, purchases, monthly } = createDependencies();

    await expect(
      executeRevenueCatPurchase({ period: 'monthly', session, purchases }),
    ).resolves.toEqual({ status: 'completed' });

    expect(session.syncAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(purchases.getOfferings).toHaveBeenCalledTimes(1);
    expect(purchases.purchasePackage).toHaveBeenCalledWith(monthly);
  });

  it('selects the annual package for yearly purchases', async () => {
    const { session, purchases, annual } = createDependencies();

    await expect(
      executeRevenueCatPurchase({ period: 'yearly', session, purchases }),
    ).resolves.toEqual({ status: 'completed' });

    expect(purchases.purchasePackage).toHaveBeenCalledWith(annual);
  });

  it('returns unavailable without touching the native SDK when billing is disabled', async () => {
    const { session, purchases } = createDependencies({
      session: {
        syncAuthenticatedUser: jest.fn(async () => ({ status: 'disabled' })),
      },
    });

    await expect(
      executeRevenueCatPurchase({ period: 'monthly', session, purchases }),
    ).resolves.toEqual({ status: 'unavailable' });

    expect(purchases.getOfferings).not.toHaveBeenCalled();
    expect(purchases.purchasePackage).not.toHaveBeenCalled();
  });

  it('returns unavailable when the requested current package is missing', async () => {
    const { session, purchases } = createDependencies({
      purchases: {
        getOfferings: jest.fn(async () => ({
          current: { monthly: null, annual: null },
          all: {},
        })),
      },
    });

    await expect(
      executeRevenueCatPurchase({ period: 'monthly', session, purchases }),
    ).resolves.toEqual({ status: 'unavailable' });

    expect(purchases.purchasePackage).not.toHaveBeenCalled();
  });

  it('normalizes user cancellation without leaking provider diagnostics', async () => {
    const { session, purchases } = createDependencies({
      purchases: {
        purchasePackage: jest.fn(async () => {
          throw {
            code: '1',
            message: 'private RevenueCat cancellation message',
            underlyingErrorMessage: 'private store detail',
          };
        }),
      },
    });

    const result = await executeRevenueCatPurchase({ period: 'monthly', session, purchases });

    expect(result).toEqual({ status: 'cancelled' });
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('normalizes provider failures to a privacy-safe failed state', async () => {
    const { session, purchases } = createDependencies({
      purchases: {
        purchasePackage: jest.fn(async () => {
          throw {
            code: '10',
            message: 'private network diagnostic',
            userInfo: { readableErrorCode: 'NETWORK_ERROR' },
          };
        }),
      },
    });

    const result = await executeRevenueCatPurchase({ period: 'yearly', session, purchases });

    expect(result).toEqual({ status: 'failed' });
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('rejects any plan period outside the internal monthly/yearly contract', async () => {
    const { session, purchases } = createDependencies();

    await expect(
      executeRevenueCatPurchase({ period: 'weekly', session, purchases }),
    ).rejects.toThrow('RevenueCat purchase period is invalid.');

    expect(session.syncAuthenticatedUser).not.toHaveBeenCalled();
  });
});
