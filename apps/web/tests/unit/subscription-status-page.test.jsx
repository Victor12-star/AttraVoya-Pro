import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMyEntitlements: vi.fn(),
  getStripeCheckoutAvailability: vi.fn(),
  getStripePlanCatalog: vi.fn(),
  createStripeCheckout: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getMyEntitlements: mocks.getMyEntitlements,
    getStripeCheckoutAvailability: mocks.getStripeCheckoutAvailability,
    getStripePlanCatalog: mocks.getStripePlanCatalog,
    createStripeCheckout: mocks.createStripeCheckout,
  },
}));

const {
  SubscriptionStatusPage,
  normalizeCheckoutAvailability,
  normalizeStripeCheckoutUrl,
  normalizeStripePlanCatalog,
  normalizeSubscriptionAccess,
} = await import('../../src/features/subscriptions/subscription-status-page.jsx');
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
    mocks.getStripeCheckoutAvailability.mockReset();
    mocks.getStripePlanCatalog.mockReset();
    mocks.createStripeCheckout.mockReset();
    mocks.getStripeCheckoutAvailability.mockResolvedValue({ available: false, planKeys: [] });
  });

  it('renders authoritative Free state and keeps checkout unavailable when the server disables it', async () => {
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
    expect(await screen.findByText(copy.purchaseUnavailable)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /secure checkout/i }),
    ).not.toBeInTheDocument();
  });

  it('renders only server-validated Stripe plan pricing when checkout is available', async () => {
    mocks.getMyEntitlements.mockResolvedValue({
      access: {
        plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
        entitlements: [],
        limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
        subscription: null,
      },
    });
    mocks.getStripeCheckoutAvailability.mockResolvedValue({
      available: true,
      planKeys: ['PRO_MONTHLY', 'PRO_YEARLY'],
    });
    mocks.getStripePlanCatalog.mockResolvedValue({
      plans: [
        {
          planKey: 'PRO_MONTHLY',
          name: 'Pro Monthly',
          unitAmount: 9900,
          currency: 'sek',
          interval: 'month',
        },
        {
          planKey: 'PRO_YEARLY',
          name: 'Pro Yearly',
          unitAmount: 99000,
          currency: 'sek',
          interval: 'year',
        },
      ],
    });

    renderPage('en');

    expect(await screen.findByRole('heading', { name: 'Pro Monthly', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pro Yearly', level: 3 })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `${copy.checkoutButton}: Pro Monthly` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `${copy.checkoutButton}: Pro Yearly` }),
    ).toBeInTheDocument();
  });

  it('fails closed when checkout discovery returns malformed provider presentation state', async () => {
    mocks.getMyEntitlements.mockResolvedValue({
      access: {
        plan: { key: 'FREE', tier: 'FREE', name: 'Free' },
        entitlements: [],
        limits: { maxTrips: 1, maxFavorites: 10, offlineMaps: 0 },
        subscription: null,
      },
    });
    mocks.getStripeCheckoutAvailability.mockResolvedValue({
      available: true,
      planKeys: ['PRO_MONTHLY', 'PRO_YEARLY'],
    });
    mocks.getStripePlanCatalog.mockResolvedValue({
      plans: [
        {
          planKey: 'PRO_MONTHLY',
          name: 'Pro Monthly',
          unitAmount: -1,
          currency: 'sek',
          interval: 'month',
        },
      ],
    });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.purchaseLoadError);
    expect(screen.queryByRole('button', { name: /secure checkout/i })).not.toBeInTheDocument();
  });

  it('renders only minimal active Pro subscription state and no second-purchase surface', async () => {
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
    expect(mocks.getStripeCheckoutAvailability).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /secure checkout/i })).not.toBeInTheDocument();
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

describe('subscription and checkout normalizers', () => {
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

  it('strictly normalizes capability and provider pricing', () => {
    expect(
      normalizeCheckoutAvailability({
        available: true,
        planKeys: ['PRO_YEARLY', 'PRO_MONTHLY'],
      }),
    ).toEqual({
      available: true,
      planKeys: ['PRO_MONTHLY', 'PRO_YEARLY'],
    });
    expect(
      normalizeCheckoutAvailability({
        available: true,
        planKeys: ['PRO_MONTHLY'],
      }),
    ).toBeNull();

    expect(
      normalizeStripePlanCatalog({
        plans: [
          {
            planKey: 'PRO_YEARLY',
            name: 'Pro Yearly',
            unitAmount: 120000,
            currency: 'sek',
            interval: 'year',
          },
          {
            planKey: 'PRO_MONTHLY',
            name: 'Pro Monthly',
            unitAmount: 12000,
            currency: 'sek',
            interval: 'month',
          },
        ],
      }),
    ).toEqual([
      {
        planKey: 'PRO_MONTHLY',
        name: 'Pro Monthly',
        unitAmount: 12000,
        currency: 'sek',
        interval: 'month',
      },
      {
        planKey: 'PRO_YEARLY',
        name: 'Pro Yearly',
        unitAmount: 120000,
        currency: 'sek',
        interval: 'year',
      },
    ]);
  });

  it('accepts only the Stripe-hosted checkout destination', () => {
    expect(
      normalizeStripeCheckoutUrl({
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_example',
      }),
    ).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(
      normalizeStripeCheckoutUrl({
        checkoutUrl: 'https://evil.example/checkout',
      }),
    ).toBeNull();
  });
});
