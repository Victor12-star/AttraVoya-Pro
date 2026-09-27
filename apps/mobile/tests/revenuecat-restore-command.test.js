import { describe, expect, it, jest } from '@jest/globals';

import { executeRevenueCatRestore } from '../src/services/revenuecat-restore-command.js';

function createDependencies(overrides = {}) {
  return {
    session: {
      syncAuthenticatedUser: jest.fn(async () => ({ status: 'ready' })),
      ...overrides.session,
    },
    purchases: {
      restorePurchases: jest.fn(async () => ({
        customerInfo: { entitlements: { active: { pro: { shouldNotBeTrusted: true } } } },
      })),
      ...overrides.purchases,
    },
  };
}

describe('RevenueCat restore command', () => {
  it('restores provider purchases without returning CustomerInfo as entitlement state', async () => {
    const { session, purchases } = createDependencies();

    await expect(executeRevenueCatRestore({ session, purchases })).resolves.toEqual({
      status: 'completed',
    });

    expect(session.syncAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(purchases.restorePurchases).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable without loading restore when Android billing is disabled', async () => {
    const { session, purchases } = createDependencies({
      session: {
        syncAuthenticatedUser: jest.fn(async () => ({ status: 'disabled' })),
      },
    });

    await expect(executeRevenueCatRestore({ session, purchases })).resolves.toEqual({
      status: 'unavailable',
    });

    expect(purchases.restorePurchases).not.toHaveBeenCalled();
  });

  it('normalizes provider failures without leaking diagnostics', async () => {
    const { session, purchases } = createDependencies({
      purchases: {
        restorePurchases: jest.fn(async () => {
          throw new Error('private RevenueCat restore diagnostic');
        }),
      },
    });

    const result = await executeRevenueCatRestore({ session, purchases });

    expect(result).toEqual({ status: 'failed' });
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('requires the identified session and restore adapter boundaries', async () => {
    await expect(
      executeRevenueCatRestore({ session: null, purchases: { restorePurchases: jest.fn() } }),
    ).rejects.toThrow('RevenueCat Android session is required.');

    await expect(
      executeRevenueCatRestore({
        session: { syncAuthenticatedUser: jest.fn() },
        purchases: null,
      }),
    ).rejects.toThrow('RevenueCat Purchases restore adapter is required.');
  });
});
