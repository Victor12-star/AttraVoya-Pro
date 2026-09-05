import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@attravoya/api-client';

const mocks = vi.hoisted(() => ({
  getBudgetAllocation: vi.fn(),
  listBudgetPlanRequests: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getBudgetAllocation: mocks.getBudgetAllocation,
    listBudgetPlanRequests: mocks.listBudgetPlanRequests,
  },
}));

const { BudgetAllocationSection } = await import(
  '../../src/features/planner/budget-allocation-section.jsx'
);
const { BUDGET_ALLOCATION_LOCALES, getBudgetAllocationCopy } = await import(
  '../../src/features/planner/budget-allocation-copy.js'
);
const { getBudgetPlannerCopy } = await import(
  '../../src/features/planner/budget-planner-copy.js'
);

const copy = getBudgetAllocationCopy('en');
const plannerCopy = getBudgetPlannerCopy('en');

function savedRequest() {
  return {
    id: 'request-1',
    origin: { label: 'Stockholm', cityId: null, airportId: null },
    budget: { amount: '1000', currencyCode: 'SEK', safetyReservePercent: '10' },
    status: 'DRAFT',
  };
}

function allocation(overrides = {}) {
  return {
    requestId: 'request-1',
    currencyCode: 'SEK',
    totalBudget: '1000.00',
    safetyReserve: {
      category: 'SAFETY_RESERVE',
      amount: '100.00',
      percentOfTotal: '10.00',
      basis: 'USER_INPUT_DERIVED',
    },
    spendableBudget: '900.00',
    targets: [
      {
        category: 'FLIGHTS',
        amount: '270.00',
        percentOfSpendable: '30.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'ACCOMMODATION',
        amount: '288.00',
        percentOfSpendable: '32.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'FOOD',
        amount: '135.00',
        percentOfSpendable: '15.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'LOCAL_TRANSPORT',
        amount: '72.00',
        percentOfSpendable: '8.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'ACTIVITIES',
        amount: '63.00',
        percentOfSpendable: '7.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'CHILDREN_ACTIVITIES',
        amount: '27.00',
        percentOfSpendable: '3.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'AIRPORT_TRANSFER',
        amount: '27.00',
        percentOfSpendable: '3.00',
        basis: 'PLANNING_TARGET',
      },
      {
        category: 'TRAVEL_INSURANCE',
        amount: '18.00',
        percentOfSpendable: '2.00',
        basis: 'PLANNING_TARGET',
      },
    ],
    provenance: {
      kind: 'PLANNING_TARGET',
      policyKey: 'attravoya-budget-envelope-v1',
      policyVersion: 1,
      liveDataUsed: false,
      providerDataUsed: false,
    },
    ...overrides,
  };
}

describe('BudgetAllocationSection', () => {
  beforeEach(() => {
    mocks.getBudgetAllocation.mockReset();
    mocks.listBudgetPlanRequests.mockReset();
    mocks.listBudgetPlanRequests.mockResolvedValue({ requests: [savedRequest()] });
    mocks.getBudgetAllocation.mockResolvedValue({ allocation: allocation() });
  });

  it('provides allocation copy for all 18 supported UI locales', () => {
    expect(BUDGET_ALLOCATION_LOCALES).toEqual([
      'en',
      'sv',
      'es',
      'de',
      'fr',
      'it',
      'pt',
      'nl',
      'no',
      'da',
      'fi',
      'pl',
      'tr',
      'ar',
      'zh',
      'ja',
      'ko',
      'hi',
    ]);

    for (const locale of BUDGET_ALLOCATION_LOCALES) {
      const localized = getBudgetAllocationCopy(locale);
      expect(localized.title).toBeTruthy();
      expect(localized.provenance).toBeTruthy();
      expect(Object.keys(localized.categories)).toHaveLength(8);
    }
  });

  it('shows exact saved-budget amounts and clear non-market provenance after selection', async () => {
    render(<BudgetAllocationSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    expect(
      await screen.findByText('Choose a saved planning brief to view its allocation targets.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Saved planning brief'), {
      target: { value: 'request-1' },
    });

    expect(
      await screen.findByText(
        'These amounts divide your saved budget. They are not fares, market prices, quotes, live estimates, availability, or destination-specific cost estimates.',
      ),
    ).toBeInTheDocument();
    expect(mocks.getBudgetAllocation).toHaveBeenCalledWith('request-1');
    expect(screen.getByText('1,000.00 SEK')).toBeInTheDocument();
    expect(screen.getByText('100.00 SEK')).toBeInTheDocument();
    expect(screen.getByText('900.00 SEK')).toBeInTheDocument();
    expect(screen.getByText('270.00 SEK')).toBeInTheDocument();
    expect(screen.getByText('288.00 SEK')).toBeInTheDocument();
    expect(
      screen.queryByText(/best price|available now|book now|live fare/i),
    ).not.toBeInTheDocument();
  });

  it('shows an authentication action without leaking API details', async () => {
    mocks.listBudgetPlanRequests.mockRejectedValue(
      new ApiClientError('private authentication detail', {
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
      }),
    );

    render(<BudgetAllocationSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    expect(
      await screen.findByText('Sign in to save and view private planning briefs.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('private authentication detail')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('retries an allocation outage without exposing the underlying error', async () => {
    mocks.getBudgetAllocation
      .mockRejectedValueOnce(new Error('private allocation database detail'))
      .mockResolvedValueOnce({ allocation: allocation() });

    render(<BudgetAllocationSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    await screen.findByText('Choose a saved planning brief to view its allocation targets.');
    fireEvent.change(screen.getByLabelText('Saved planning brief'), {
      target: { value: 'request-1' },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This budget allocation could not be loaded right now.',
    );
    expect(screen.queryByText(/private allocation database detail/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(mocks.getBudgetAllocation).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('1,000.00 SEK')).toBeInTheDocument();
  });

  it('refuses to label provider-backed data as a planning-only envelope', async () => {
    mocks.getBudgetAllocation.mockResolvedValue({
      allocation: allocation({
        provenance: {
          kind: 'PLANNING_TARGET',
          policyKey: 'attravoya-budget-envelope-v1',
          policyVersion: 1,
          liveDataUsed: true,
          providerDataUsed: true,
        },
      }),
    });

    render(<BudgetAllocationSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    await screen.findByText('Choose a saved planning brief to view its allocation targets.');
    fireEvent.change(screen.getByLabelText('Saved planning brief'), {
      target: { value: 'request-1' },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This budget allocation could not be loaded right now.',
    );
    expect(screen.queryByText(copy.provenance)).not.toBeInTheDocument();
  });
});
