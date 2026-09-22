import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import {
  MobileSubscriptionStatusContent,
  normalizeMobileSubscriptionAccess,
} from '../src/features/subscriptions/subscription-status-screen.jsx';

function renderContent(client) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MobileSubscriptionStatusContent client={client} />
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

    renderContent(client);

    expect(await screen.findByText('Free')).toBeTruthy();
    expect(screen.getByText('Your account is using the Free plan.')).toBeTruthy();
    expect(
      screen.getByText('New subscription purchases are not available in this build yet.'),
    ).toBeTruthy();
    expect(screen.queryByText(/buy now|subscribe now|upgrade now/i)).toBeNull();
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

    renderContent(client);

    expect(await screen.findByText('Pro Monthly')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Current period ends')).toBeTruthy();
    expect(screen.queryByText('must-not-render')).toBeNull();
    expect(
      screen.queryByText('New subscription purchases are not available in this build yet.'),
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

    renderContent(client);

    expect(await screen.findByText('Plan status unavailable')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByText('Free')).toBeTruthy();
    expect(client.getMyEntitlements).toHaveBeenCalledTimes(2);
  });

  it('shows a privacy-safe offline recovery state', async () => {
    const client = {
      getMyEntitlements: jest.fn().mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'private diagnostic detail',
      }),
    };

    renderContent(client);

    expect(await screen.findByText('Plan status unavailable')).toBeTruthy();
    expect(screen.getByText('You appear to be offline. Reconnect and try again.')).toBeTruthy();
    expect(screen.queryByText('private diagnostic detail')).toBeNull();
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
