import { describe, expect, it, jest } from '@jest/globals';

import { createRevenueCatAuthSynchronizer } from '../src/services/revenuecat-auth-synchronizer.js';

describe('RevenueCat authentication synchronizer', () => {
  it('is safely inert until a RevenueCat session is supplied', async () => {
    const synchronizer = createRevenueCatAuthSynchronizer();

    await expect(synchronizer.onAuthenticated()).resolves.toEqual({ status: 'skipped' });
    await expect(synchronizer.onAnonymous()).resolves.toEqual({ status: 'skipped' });
  });

  it('rejects an incomplete billing session during composition', () => {
    expect(() =>
      createRevenueCatAuthSynchronizer({ syncAuthenticatedUser: jest.fn() }),
    ).toThrow('RevenueCat authentication session is invalid.');
  });

  it('serializes identity transitions in authentication order', async () => {
    let releaseSync;
    const gate = new Promise((resolve) => {
      releaseSync = resolve;
    });
    const events = [];
    const session = {
      syncAuthenticatedUser: jest.fn(async () => {
        events.push('sync:start');
        await gate;
        events.push('sync:end');
        return { status: 'configured' };
      }),
      clearAuthenticatedUser: jest.fn(async () => {
        events.push('clear');
        return { status: 'anonymous' };
      }),
    };
    const synchronizer = createRevenueCatAuthSynchronizer(session);

    const authenticated = synchronizer.onAuthenticated();
    const anonymous = synchronizer.onAnonymous();

    await Promise.resolve();
    expect(events).toEqual(['sync:start']);
    releaseSync();

    await expect(authenticated).resolves.toEqual({ status: 'configured' });
    await expect(anonymous).resolves.toEqual({ status: 'anonymous' });
    expect(events).toEqual(['sync:start', 'sync:end', 'clear']);
  });

  it('contains provider failures so later auth transitions still run', async () => {
    const session = {
      syncAuthenticatedUser: jest.fn(async () => {
        throw new Error('RevenueCat unavailable');
      }),
      clearAuthenticatedUser: jest.fn(async () => ({ status: 'anonymous' })),
    };
    const synchronizer = createRevenueCatAuthSynchronizer(session);

    await expect(synchronizer.onAuthenticated()).resolves.toEqual({ status: 'unavailable' });
    await expect(synchronizer.onAnonymous()).resolves.toEqual({ status: 'anonymous' });
    expect(session.clearAuthenticatedUser).toHaveBeenCalledTimes(1);
  });
});
