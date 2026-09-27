import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  MobileSubscriptionStatusContent,
  normalizeMobileSubscriptionAccess,
} from '../src/features/subscriptions/subscription-status-screen.jsx';

function renderContent(client, loadOfferingCatalog, purchasePlan) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MobileSubscriptionStatusContent
        client={client}
        loadOfferingCatalog={loadOfferingCatalog}
        purchasePlan={purchasePlan}
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
      result.getByText('Google Play handles the payment. AttraVoya enables Pro only after your server verified plan status confirms it.'),
    ).toBeTruthy();
    expect(result.queryByText(/buy now|subscribe now|upgrade now/i)).toBeNull();
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
      result.getByText('Google Play handles the payment. AttraVoya enables Pro only after your server verified plan status confirms it.'),
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
    const loadOfferingCatalog = jest.fn().mockResolvedValue([
      { period: 'monthly', price: 'SEK 49.00' },
    ]);
    const purchasePlan = jest.fn().mockResolvedValue({ status: 'completed' });

    const result = await renderContent(client, loadOfferingCatalog, purchasePlan);

    expect(await result.findByText('SEK 49.00')).toBeTruthy();
    await fireEvent.press(result.getByText('Choose monthly'));

    expect(purchasePlan).toHaveBeenCalledWith('monthly');
    expect(await result.findByText('Pro Monthly')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(2);
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
    const loadOfferingCatalog = jest.fn().mockResolvedValue([
      { period: 'yearly', price: 'SEK 399.00' },
    ]);
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
      result.getByText('Google Play handles the payment. AttraVoya enables Pro only after your server verified plan status confirms it.'),
    ).toBeTruthy();
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
      result.queryByText('Google Play handles the payment. AttraVoya enables Pro only after your server verified plan status confirms it.'),
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
    });
  });
});
