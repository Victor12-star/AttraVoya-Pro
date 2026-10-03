import { act, fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  MobileSubscriptionStatusContent,
  normalizeAndroidPurchaseAvailability,
  normalizeMobileSubscriptionAccess,
} from '../src/features/subscriptions/subscription-status-screen.jsx';

function renderContent(
  client,
  loadOfferingCatalog,
  purchasePlan,
  restorePurchases,
  openSubscriptionManagement,
  subscribeToAppState,
  verificationRetryDelaysMs = [],
  waitForVerificationDelay,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const effectiveClient =
    loadOfferingCatalog && typeof client?.getRevenueCatAndroidPurchaseAvailability !== 'function'
      ? {
          ...client,
          getRevenueCatAndroidPurchaseAvailability: jest.fn().mockResolvedValue({
            available: true,
            planKeys: ['PRO_MONTHLY', 'PRO_YEARLY'],
          }),
        }
      : client;

  return render(
    <QueryClientProvider client={queryClient}>
      <MobileSubscriptionStatusContent
        client={effectiveClient}
        loadOfferingCatalog={loadOfferingCatalog}
        openSubscriptionManagement={openSubscriptionManagement}
        purchasePlan={purchasePlan}
        restorePurchases={restorePurchases}
        subscribeToAppState={subscribeToAppState}
        verificationRetryDelaysMs={verificationRetryDelaysMs}
        waitForVerificationDelay={waitForVerificationDelay}
      />
    </QueryClientProvider>,
  );
}

describe('mobile subscription status', () => {
  it('renders authoritative Free state without purchase or upgrade actions', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
          entitlements: [],
          limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
          subscription: null,
        },
      }),
    };

    const result = await renderContent(client);

    expect(await result.findByText('Your account is using the Free plan.')).toBeTruthy();
    expect(
      result.getByText(
        'Google Play handles the payment. AttraVoya enables Pro only after your server verified plan status confirms it.',
      ),
    ).toBeTruthy();
    expect(result.queryByText(/buy now|subscribe now|upgrade now/i)).toBeNull();
  });

  it('keeps Google Play offerings inert when the server says purchases are unavailable', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
          entitlements: [],
          limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
          subscription: null,
        },
      }),
      getRevenueCatAndroidPurchaseAvailability: jest.fn().mockResolvedValue({
        available: false,
        planKeys: [],
      }),
    };
    const loadOfferingCatalog = jest
      .fn()
      .mockResolvedValue([{ period: 'monthly', price: 'SEK 49.00' }]);
    const purchasePlan = jest.fn();

    const result = await renderContent(client, loadOfferingCatalog, purchasePlan);

    expect(
      await result.findByText('Google Play purchasing is unavailable right now.'),
    ).toBeTruthy();
    expect(result.queryByText('SEK 49.00')).toBeNull();
    expect(result.queryByText('Choose monthly')).toBeNull();
    expect(loadOfferingCatalog).not.toHaveBeenCalled();
    expect(purchasePlan).not.toHaveBeenCalled();
  });

  it('fails closed when Android purchase availability cannot be verified', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
          entitlements: [],
          limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
          subscription: null,
        },
      }),
      getRevenueCatAndroidPurchaseAvailability: jest
        .fn()
        .mockRejectedValue(new Error('private backend readiness diagnostic')),
    };
    const loadOfferingCatalog = jest.fn();

    const result = await renderContent(client, loadOfferingCatalog, jest.fn());

    expect(
      await result.findByText('Google Play purchasing is unavailable right now.'),
    ).toBeTruthy();
    expect(result.queryByText('private backend readiness diagnostic')).toBeNull();
    expect(loadOfferingCatalog).not.toHaveBeenCalled();
  });

  it('shows read-only monthly and yearly Google Play prices for Free users', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
          entitlements: [],
          limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
          subscription: null,
        },
      }),
    };
    const loadOfferingCatalog = jest.fn().mockResolvedValue([
      { period: 'monthly', price: 'SEK 49.00' },
      { period: 'yearly', price: 'SEK 399.00' },
    ]);

    const result = await renderContent(client, loadOfferingCatalog);

    expect(await result.findByText('Google Play prices')).toBeTruthy();
    expect(await result.findByText('SEK 49.00')).toBeTruthy();
    expect(result.getByText('SEK 399.00')).toBeTruthy();
    expect(result.getByText('Monthly')).toBeTruthy();
    expect(result.getByText('Yearly')).toBeTruthy();
    expect(
      result.getByText(
        'Google Play handles the payment. AttraVoya enables Pro only after your server verified plan status confirms it.',
      ),
    ).toBeTruthy();
    expect(result.queryByText(/buy now|subscribe now|upgrade now/i)).toBeNull();
    expect(loadOfferingCatalog).toHaveBeenCalledTimes(1);
  });

  it('never grants Pro locally after a completed purchase and waits for server verification', async () => {
    const client = {
      getMyEntitlements: jest
        .fn()
        .mockResolvedValueOnce({
          access: {
            plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
            entitlements: [],
            limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
            subscription: null,
          },
        })
        .mockResolvedValueOnce({
          access: {
            plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
            entitlements: ['offline_maps'],
            limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
            subscription: {
              status: 'ACTIVE',
              currentPeriodEnd: '2026-10-22T17:00:00.000Z',
            },
          },
        }),
    };
    const loadOfferingCatalog = jest
      .fn()
      .mockResolvedValue([{ period: 'monthly', price: 'SEK 49.00' }]);
    const purchasePlan = jest.fn().mockResolvedValue({ status: 'completed' });

    const result = await renderContent(client, loadOfferingCatalog, purchasePlan);

    expect(await result.findByText('SEK 49.00')).toBeTruthy();
    await fireEvent.press(result.getByText('Choose monthly'));

    expect(purchasePlan).toHaveBeenCalledWith('monthly');
    expect(await result.findByText('Pro Monthly')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(2);
  });

  it('rechecks only the authoritative server while a completed purchase webhook catches up', async () => {
    const freeAccess = {
      access: {
        plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
        entitlements: [],
        limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
        subscription: null,
      },
    };
    const client = {
      getMyEntitlements: jest
        .fn()
        .mockResolvedValueOnce(freeAccess)
        .mockResolvedValueOnce(freeAccess)
        .mockResolvedValueOnce(freeAccess)
        .mockResolvedValueOnce({
          access: {
            plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
            entitlements: ['offline_maps'],
            limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
            subscription: {
              status: 'ACTIVE',
              currentPeriodEnd: '2026-10-22T17:00:00.000Z',
            },
          },
        }),
    };
    const loadOfferingCatalog = jest
      .fn()
      .mockResolvedValue([{ period: 'monthly', price: 'SEK 49.00' }]);
    const purchasePlan = jest.fn().mockResolvedValue({ status: 'completed' });
    const waitForVerificationDelay = jest.fn().mockResolvedValue(undefined);

    const result = await renderContent(
      client,
      loadOfferingCatalog,
      purchasePlan,
      undefined,
      undefined,
      undefined,
      [5_000, 10_000],
      waitForVerificationDelay,
    );

    expect(await result.findByText('SEK 49.00')).toBeTruthy();
    await fireEvent.press(result.getByText('Choose monthly'));

    expect(await result.findByText('Pro Monthly')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(4);
    expect(waitForVerificationDelay).toHaveBeenNthCalledWith(1, 5_000);
    expect(waitForVerificationDelay).toHaveBeenNthCalledWith(2, 10_000);
  });

  it('keeps a cancelled purchase on Free without leaking provider details', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
          entitlements: [],
          limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
          subscription: null,
        },
      }),
    };
    const loadOfferingCatalog = jest
      .fn()
      .mockResolvedValue([{ period: 'yearly', price: 'SEK 399.00' }]);
    const purchasePlan = jest.fn().mockResolvedValue({ status: 'cancelled' });

    const result = await renderContent(client, loadOfferingCatalog, purchasePlan);

    expect(await result.findByText('SEK 399.00')).toBeTruthy();
    await fireEvent.press(result.getByText('Choose yearly'));

    expect(
      await result.findByText('Purchase cancelled. No changes were made to your AttraVoya plan.'),
    ).toBeTruthy();
    expect(result.getByText('Your account is using the Free plan.')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(1);
  });

  it('contains an unexpected purchase command error without exposing diagnostics', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
          entitlements: [],
          limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
          subscription: null,
        },
      }),
    };
    const loadOfferingCatalog = jest
      .fn()
      .mockResolvedValue([{ period: 'monthly', price: 'SEK 49.00' }]);
    const purchasePlan = jest.fn().mockRejectedValue(new Error('private store diagnostic'));

    const result = await renderContent(client, loadOfferingCatalog, purchasePlan);

    expect(await result.findByText('SEK 49.00')).toBeTruthy();
    await fireEvent.press(result.getByText('Choose monthly'));

    expect(
      await result.findByText('The purchase could not be completed safely. Please try again.'),
    ).toBeTruthy();
    expect(result.queryByText('private store diagnostic')).toBeNull();
    expect(result.getByText('Your account is using the Free plan.')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(1);
  });

  it('never grants Pro locally after restore and waits for server verification', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
          entitlements: [],
          limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
          subscription: null,
        },
      }),
    };
    const loadOfferingCatalog = jest.fn().mockResolvedValue([]);
    const restorePurchases = jest.fn().mockResolvedValue({ status: 'completed' });

    const result = await renderContent(client, loadOfferingCatalog, undefined, restorePurchases);

    expect(await result.findByText('Restore purchases')).toBeTruthy();
    await fireEvent.press(result.getByText('Restore purchases'));

    expect(restorePurchases).toHaveBeenCalledTimes(1);
    expect(
      await result.findByText(
        'Google Play restore completed. AttraVoya has not verified Pro access yet. Refresh status shortly.',
      ),
    ).toBeTruthy();
    expect(result.getByText('Your account is using the Free plan.')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(2);
  });

  it('stops bounded restore rechecks without granting Pro when the server stays Free', async () => {
    const freeAccess = {
      access: {
        plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
        entitlements: [],
        limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
        subscription: null,
      },
    };
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue(freeAccess),
    };
    const loadOfferingCatalog = jest.fn().mockResolvedValue([]);
    const restorePurchases = jest.fn().mockResolvedValue({ status: 'completed' });
    const waitForVerificationDelay = jest.fn().mockResolvedValue(undefined);

    const result = await renderContent(
      client,
      loadOfferingCatalog,
      undefined,
      restorePurchases,
      undefined,
      undefined,
      [5_000, 10_000, 15_000],
      waitForVerificationDelay,
    );

    expect(await result.findByText('Restore purchases')).toBeTruthy();
    await fireEvent.press(result.getByText('Restore purchases'));

    expect(
      await result.findByText(
        'Google Play restore completed. AttraVoya has not verified Pro access yet. Refresh status shortly.',
      ),
    ).toBeTruthy();
    expect(result.getByText('Your account is using the Free plan.')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(5);
    expect(waitForVerificationDelay).toHaveBeenCalledTimes(3);
  });

  it('shows restored Pro only after the server confirms it', async () => {
    const client = {
      getMyEntitlements: jest
        .fn()
        .mockResolvedValueOnce({
          access: {
            plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
            entitlements: [],
            limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
            subscription: null,
          },
        })
        .mockResolvedValueOnce({
          access: {
            plan: { key: 'PRO_YEARLY', tier: 'PRO', name: 'Pro Yearly' },
            entitlements: ['offline_maps'],
            limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
            subscription: {
              status: 'ACTIVE',
              currentPeriodEnd: '2027-09-27T17:00:00.000Z',
            },
          },
        }),
    };
    const loadOfferingCatalog = jest.fn().mockResolvedValue([]);
    const restorePurchases = jest.fn().mockResolvedValue({ status: 'completed' });

    const result = await renderContent(client, loadOfferingCatalog, undefined, restorePurchases);

    expect(await result.findByText('Restore purchases')).toBeTruthy();
    await fireEvent.press(result.getByText('Restore purchases'));

    expect(await result.findByText('Pro Yearly')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(2);
  });

  it('keeps restore failures private and leaves the server-verified plan unchanged', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
          entitlements: [],
          limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
          subscription: null,
        },
      }),
    };
    const loadOfferingCatalog = jest.fn().mockResolvedValue([]);
    const restorePurchases = jest
      .fn()
      .mockRejectedValue(new Error('private RevenueCat restore diagnostic'));

    const result = await renderContent(client, loadOfferingCatalog, undefined, restorePurchases);

    expect(await result.findByText('Restore purchases')).toBeTruthy();
    await fireEvent.press(result.getByText('Restore purchases'));

    expect(
      await result.findByText(
        'Previous Google Play purchases could not be restored safely. Please try again.',
      ),
    ).toBeTruthy();
    expect(result.queryByText('private RevenueCat restore diagnostic')).toBeNull();
    expect(result.getByText('Your account is using the Free plan.')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(1);
  });

  it('keeps provider failures private while leaving server-verified Free state usable', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
          entitlements: [],
          limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
          subscription: null,
        },
      }),
    };
    const loadOfferingCatalog = jest
      .fn()
      .mockRejectedValue(new Error('private RevenueCat diagnostic'));

    const result = await renderContent(client, loadOfferingCatalog);

    expect(await result.findByText('Your account is using the Free plan.')).toBeTruthy();
    expect(
      await result.findByText('Live Google Play prices are unavailable right now.'),
    ).toBeTruthy();
    expect(result.queryByText('private RevenueCat diagnostic')).toBeNull();
    expect(
      result.getByText(
        'Google Play handles the payment. AttraVoya enables Pro only after your server verified plan status confirms it.',
      ),
    ).toBeTruthy();
  });

  it('opens Google Play management only when the server authorizes that channel', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
          entitlements: ['offline_maps'],
          limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
          subscription: {
            status: 'ACTIVE',
            currentPeriodEnd: '2026-10-22T17:00:00.000Z',
            management: { channel: 'GOOGLE_PLAY' },
          },
        },
      }),
    };
    const openSubscriptionManagement = jest.fn().mockResolvedValue(undefined);

    const result = await renderContent(
      client,
      undefined,
      undefined,
      undefined,
      openSubscriptionManagement,
    );

    expect(await result.findByText('Manage in Google Play')).toBeTruthy();
    await fireEvent.press(result.getByText('Manage in Google Play'));

    expect(openSubscriptionManagement).toHaveBeenCalledTimes(1);
  });

  it('refreshes authoritative plan status once when returning from Google Play management', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
          entitlements: ['offline_maps'],
          limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
          subscription: {
            status: 'ACTIVE',
            currentPeriodEnd: '2026-10-22T17:00:00.000Z',
            management: { channel: 'GOOGLE_PLAY' },
          },
        },
      }),
    };
    const openSubscriptionManagement = jest.fn().mockResolvedValue(undefined);
    let appStateListener = null;
    const subscribeToAppState = jest.fn((listener) => {
      appStateListener = listener;
      return jest.fn();
    });

    const result = await renderContent(
      client,
      undefined,
      undefined,
      undefined,
      openSubscriptionManagement,
      subscribeToAppState,
    );

    expect(await result.findByText('Manage in Google Play')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(1);

    await fireEvent.press(result.getByText('Manage in Google Play'));
    expect(openSubscriptionManagement).toHaveBeenCalledTimes(1);

    await act(async () => {
      appStateListener?.('background');
      appStateListener?.('active');
    });

    expect(client.getMyEntitlements).toHaveBeenCalledTimes(2);

    await act(async () => {
      appStateListener?.('active');
    });

    expect(client.getMyEntitlements).toHaveBeenCalledTimes(2);
  });

  it('rechecks the authoritative server after Google Play management until plan state changes', async () => {
    const monthlyAccess = {
      access: {
        plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
        entitlements: ['offline_maps'],
        limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
        subscription: {
          status: 'ACTIVE',
          currentPeriodEnd: '2026-10-22T17:00:00.000Z',
          management: { channel: 'GOOGLE_PLAY' },
        },
      },
    };
    const yearlyAccess = {
      access: {
        plan: { key: 'PRO_YEARLY', tier: 'PRO', name: 'Pro Yearly' },
        entitlements: ['offline_maps'],
        limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
        subscription: {
          status: 'ACTIVE',
          currentPeriodEnd: '2027-10-22T17:00:00.000Z',
          management: { channel: 'GOOGLE_PLAY' },
        },
      },
    };
    const client = {
      getMyEntitlements: jest
        .fn()
        .mockResolvedValueOnce(monthlyAccess)
        .mockResolvedValueOnce(monthlyAccess)
        .mockResolvedValueOnce(monthlyAccess)
        .mockResolvedValueOnce(yearlyAccess),
    };
    const openSubscriptionManagement = jest.fn().mockResolvedValue(undefined);
    const waitForVerificationDelay = jest.fn().mockResolvedValue(undefined);
    let appStateListener = null;
    const subscribeToAppState = jest.fn((listener) => {
      appStateListener = listener;
      return jest.fn();
    });

    const result = await renderContent(
      client,
      undefined,
      undefined,
      undefined,
      openSubscriptionManagement,
      subscribeToAppState,
      [5_000, 10_000],
      waitForVerificationDelay,
    );

    expect(await result.findByText('Pro Monthly')).toBeTruthy();
    await fireEvent.press(result.getByText('Manage in Google Play'));

    await act(async () => {
      appStateListener?.('background');
      appStateListener?.('active');
    });

    expect(await result.findByText('Pro Yearly')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(4);
    expect(waitForVerificationDelay).toHaveBeenNthCalledWith(1, 5_000);
    expect(waitForVerificationDelay).toHaveBeenNthCalledWith(2, 10_000);

    await act(async () => {
      appStateListener?.('active');
    });

    expect(client.getMyEntitlements).toHaveBeenCalledTimes(4);
  });

  it('does not schedule a foreground refresh when Google Play management fails to open', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
          entitlements: ['offline_maps'],
          limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
          subscription: {
            status: 'ACTIVE',
            currentPeriodEnd: '2026-10-22T17:00:00.000Z',
            management: { channel: 'GOOGLE_PLAY' },
          },
        },
      }),
    };
    const openSubscriptionManagement = jest.fn().mockRejectedValue(new Error('private failure'));
    let appStateListener = null;
    const subscribeToAppState = jest.fn((listener) => {
      appStateListener = listener;
      return jest.fn();
    });

    const result = await renderContent(
      client,
      undefined,
      undefined,
      undefined,
      openSubscriptionManagement,
      subscribeToAppState,
    );

    expect(await result.findByText('Manage in Google Play')).toBeTruthy();
    await fireEvent.press(result.getByText('Manage in Google Play'));

    expect(
      await result.findByText(
        'Google Play subscription management could not be opened. Please try again.',
      ),
    ).toBeTruthy();

    await act(async () => {
      appStateListener?.('active');
    });

    expect(client.getMyEntitlements).toHaveBeenCalledTimes(1);
  });

  it('does not expose a management action for unknown or absent management channels', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
          entitlements: ['offline_maps'],
          limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
          subscription: {
            status: 'ACTIVE',
            currentPeriodEnd: '2026-10-22T17:00:00.000Z',
            management: { channel: 'UNKNOWN_PROVIDER' },
          },
        },
      }),
    };
    const openSubscriptionManagement = jest.fn().mockResolvedValue(undefined);

    const result = await renderContent(
      client,
      undefined,
      undefined,
      undefined,
      openSubscriptionManagement,
    );

    expect(await result.findByText('Pro Monthly')).toBeTruthy();
    expect(result.queryByText('Manage in Google Play')).toBeNull();
    expect(openSubscriptionManagement).not.toHaveBeenCalled();
  });

  it('keeps management launch failures private without changing authoritative Pro access', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
          entitlements: ['offline_maps'],
          limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
          subscription: {
            status: 'ACTIVE',
            currentPeriodEnd: '2026-10-22T17:00:00.000Z',
            management: { channel: 'GOOGLE_PLAY' },
          },
        },
      }),
    };
    const openSubscriptionManagement = jest
      .fn()
      .mockRejectedValue(new Error('private native linking diagnostic'));

    const result = await renderContent(
      client,
      undefined,
      undefined,
      undefined,
      openSubscriptionManagement,
    );

    expect(await result.findByText('Manage in Google Play')).toBeTruthy();
    await fireEvent.press(result.getByText('Manage in Google Play'));

    expect(
      await result.findByText(
        'Google Play subscription management could not be opened. Please try again.',
      ),
    ).toBeTruthy();
    expect(result.queryByText('private native linking diagnostic')).toBeNull();
    expect(result.getByText('Your account currently has AttraVoya Pro access.')).toBeTruthy();
  });

  it('renders only minimal active Pro state and never exposes provider identifiers', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockResolvedValue({
        access: {
          plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
          entitlements: ['offline_maps'],
          limits: { maxTrips: null, maxFavorites: null, offlineMaps: null },
          subscription: {
            status: 'ACTIVE',
            currentPeriodEnd: '2026-10-22T17:00:00.000Z',
            externalCustomerId: 'must-not-render',
          },
        },
      }),
    };

    const result = await renderContent(client);

    expect(await result.findByText('Pro Monthly')).toBeTruthy();
    expect(result.getByText('Active')).toBeTruthy();
    expect(result.getByText('Current period ends')).toBeTruthy();
    expect(result.queryByText('must-not-render')).toBeNull();
    expect(
      result.queryByText(
        'Google Play handles the payment. AttraVoya enables Pro only after your server verified plan status confirms it.',
      ),
    ).toBeNull();
  });

  it('fails closed on malformed Pro state and retries safely', async () => {
    const client = {
      getMyEntitlements: jest
        .fn()
        .mockResolvedValueOnce({
          access: {
            plan: { key: 'PRO_YEARLY', tier: 'PRO', name: 'Pro Yearly' },
            subscription: null,
          },
        })
        .mockResolvedValueOnce({
          access: {
            plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
            entitlements: [],
            limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
            subscription: null,
          },
        }),
    };

    const result = await renderContent(client);

    expect(await result.findByText('Plan status unavailable')).toBeTruthy();
    await fireEvent.press(result.getByText('Try again'));

    expect(await result.findByText('Your account is using the Free plan.')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(2);
  });

  it('shows a privacy-safe offline recovery state', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'private diagnostic detail',
      }),
    };

    const result = await renderContent(client);

    expect(await result.findByText('Plan status unavailable')).toBeTruthy();
    expect(result.getByText('You appear to be offline. Reconnect and try again.')).toBeTruthy();
    expect(result.queryByText('private diagnostic detail')).toBeNull();
  });
});

describe('normalizeAndroidPurchaseAvailability', () => {
  it('accepts only the complete server-owned Android purchase readiness contract', () => {
    expect(
      normalizeAndroidPurchaseAvailability({
        available: true,
        planKeys: ['PRO_MONTHLY', 'PRO_YEARLY'],
      }),
    ).toEqual({ available: true });
    expect(normalizeAndroidPurchaseAvailability({ available: false, planKeys: [] })).toEqual({
      available: false,
    });
  });

  it('rejects malformed or partial readiness claims', () => {
    for (const value of [
      null,
      {},
      { available: true, planKeys: [] },
      { available: true, planKeys: ['PRO_MONTHLY'] },
      { available: true, planKeys: ['PRO_MONTHLY', 'PRO_MONTHLY'] },
      { available: false, planKeys: ['PRO_MONTHLY'] },
    ]) {
      expect(normalizeAndroidPurchaseAvailability(value)).toBeNull();
    }
  });
});

describe('normalizeMobileSubscriptionAccess', () => {
  it('rejects unknown plans and invalid period dates', () => {
    expect(
      normalizeMobileSubscriptionAccess({
        access: {
          plan: { key: 'UNKNOWN', tier: 'PRO', name: 'Unknown' },
          subscription: { status: 'ACTIVE', currentPeriodEnd: '2026-10-22T17:00:00.000Z' },
        },
      }),
    ).toBeNull();

    expect(
      normalizeMobileSubscriptionAccess({
        access: {
          plan: { key: 'PRO_YEARLY', tier: 'PRO', name: 'Pro Yearly' },
          subscription: { status: 'ACTIVE', currentPeriodEnd: 'not-a-date' },
        },
      }),
    ).toBeNull();
  });

  it('accepts a valid trial without trusting unrelated response fields', () => {
    expect(
      normalizeMobileSubscriptionAccess({
        access: {
          plan: { key: 'PRO_YEARLY', tier: 'PRO', name: 'Pro Yearly' },
          entitlements: ['advanced_weather'],
          subscription: {
            status: 'TRIALING',
            currentPeriodEnd: '2026-11-22T17:00:00.000Z',
            provider: 'must-not-use',
          },
        },
      }),
    ).toEqual({
      key: 'PRO_YEARLY',
      tier: 'PRO',
      name: 'Pro Yearly',
      status: 'TRIALING',
      currentPeriodEnd: '2026-11-22T17:00:00.000Z',
      managementChannel: null,
    });
  });
});
