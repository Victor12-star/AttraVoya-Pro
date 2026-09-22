import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMyEntitlements: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getMyEntitlements: mocks.getMyEntitlements,
  },
}));

const { SubscriptionStatusPage, normalizeSubscriptionAccess } =
  await import('../../src/features/subscriptions/subscription-status-page.jsx');
const { getSubscriptionStatusCopy } =
  await import('../../src/features/subscriptions/subscription-status-copy.js');

const copy = getSubscriptionStatusCopy('en');
const common = { loading: 'Loading…', retry: 'Retry' };

function renderPage(locale = 'en') {
  return render(
    <SubscriptionStatusPage
      locale={locale}
      copy={getSubscriptionStatusCopy(locale)}
      common={common}
      signInLabel="Sign in"
    />,
  );
}

describe('SubscriptionStatusPage', () => {
  beforeEach(() => {
    mocks.getMyEntitlements.mockReset();
  });

  it('renders authoritative Free state without pretending checkout exists', async () => {
    mocks.getMyEntitlements.mockResolvedValue({
      access: {
        plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
        entitlements: [],
        limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
        subscription: null,
      },
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Free', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(copy.freeDetail)).toBeInTheDocument();
    expect(screen.getByText(copy.purchaseUnavailable)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /buy|subscribe|upgrade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /buy|subscribe|upgrade/i })).not.toBeInTheDocument();
  });

  it('renders only minimal active Pro subscription state', async () => {
    mocks.getMyEntitlements.mockResolvedValue({
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
    });

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Pro Monthly', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.active)).toBeInTheDocument();
    expect(screen.getByText(copy.periodEnds)).toBeInTheDocument();
    expect(screen.queryByText('must-not-render')).not.toBeInTheDocument();
    expect(screen.queryByText(copy.purchaseUnavailable)).not.toBeInTheDocument();
  });

  it('shows a sign-in action for an unauthenticated request without leaking backend details', async () => {
    mocks.getMyEntitlements.mockRejectedValue({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
      message: 'private backend details',
    });

    renderPage();

    expect(await screen.findByText(copy.signInPrompt)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByText('private backend details')).not.toBeInTheDocument();
  });

  it('fails closed on malformed access state and can retry safely', async () => {
    mocks.getMyEntitlements
      .mockResolvedValueOnce({
        access: {
          plan: { key: 'PRO_MONTHLY', tier: 'PRO', name: 'Pro Monthly' },
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
      });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.loadError);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Free', level: 2 })).toBeInTheDocument();
    expect(mocks.getMyEntitlements).toHaveBeenCalledTimes(2);
  });
});

describe('normalizeSubscriptionAccess', () => {
  it('rejects unknown plans and incomplete Pro records', () => {
    expect(
      normalizeSubscriptionAccess({
        access: {
          plan: { key: 'UNKNOWN', tier: 'PRO', name: 'Unknown' },
          subscription: { status: 'ACTIVE', currentPeriodEnd: '2026-10-22T17:00:00.000Z' },
        },
      }),
    ).toBeNull();

    expect(
      normalizeSubscriptionAccess({
        access: {
          plan: { key: 'PRO_YEARLY', tier: 'PRO', name: 'Pro Yearly' },
          subscription: { status: 'ACTIVE', currentPeriodEnd: 'not-a-date' },
        },
      }),
    ).toBeNull();
  });
});
