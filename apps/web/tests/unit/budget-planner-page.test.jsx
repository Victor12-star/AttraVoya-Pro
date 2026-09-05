import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@attravoya/api-client';

const mocks = vi.hoisted(() => ({
  createBudgetPlanRequest: vi.fn(),
  listBudgetPlanRequests: vi.fn(),
  readPreferences: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    createBudgetPlanRequest: mocks.createBudgetPlanRequest,
    listBudgetPlanRequests: mocks.listBudgetPlanRequests,
  },
}));

vi.mock('../../src/lib/preferences.js', () => ({
  readPreferences: mocks.readPreferences,
}));

const { BudgetPlannerPage } =
  await import('../../src/features/planner/budget-planner-page.jsx');
const { getBudgetPlannerCopy } =
  await import('../../src/features/planner/budget-planner-copy.js');

const copy = getBudgetPlannerCopy('en');

function savedRequest(overrides = {}) {
  return {
    id: 'request-1',
    origin: { label: 'Stockholm', cityId: null, airportId: null },
    targetDestination: null,
    dates: {
      flexible: false,
      fixedDeparture: '2026-10-10',
      fixedReturn: '2026-10-17',
      earliestDeparture: null,
      latestReturn: null,
      minNights: 2,
      maxNights: 14,
    },
    budget: { amount: '25000', currencyCode: 'SEK', safetyReservePercent: '7.5' },
    travellers: { adults: 2, childrenAges: [4, 8] },
    interests: ['history', 'food'],
    comfortLevel: 'VALUE',
    status: 'DRAFT',
    createdAt: '2026-09-05T20:00:00.000Z',
    updatedAt: '2026-09-05T20:00:00.000Z',
    ...overrides,
  };
}

describe('BudgetPlannerPage', () => {
  beforeEach(() => {
    mocks.createBudgetPlanRequest.mockReset();
    mocks.listBudgetPlanRequests.mockReset();
    mocks.readPreferences.mockReset();
    mocks.readPreferences.mockReturnValue({});
    mocks.listBudgetPlanRequests.mockResolvedValue({ requests: [] });
    mocks.createBudgetPlanRequest.mockResolvedValue({ planRequest: savedRequest() });
  });

  it('renders the open-destination planner honestly and loads an empty private draft list', async () => {
    render(<BudgetPlannerPage copy={copy} defaultCurrency="SEK" />);

    expect(
      screen.getByRole('heading', { name: 'Plan the trip around your budget', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Destination is open', { selector: 'span' })).toBeInTheDocument();
    expect(await screen.findByText('No saved planning briefs yet.')).toBeInTheDocument();
    expect(mocks.listBudgetPlanRequests).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/does not claim live fares, prices, availability/i)).toBeInTheDocument();
    expect(screen.queryByText(/best destination/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/live price/i)).not.toBeInTheDocument();
  });

  it('validates and saves a fixed-date planning brief through the shared API contract', async () => {
    render(<BudgetPlannerPage copy={copy} defaultCurrency="SEK" />);
    await screen.findByText('No saved planning briefs yet.');

    fireEvent.change(screen.getByLabelText('Where are you travelling from?'), {
      target: { value: 'Stockholm' },
    });
    fireEvent.click(screen.getByLabelText('I know my dates'));
    fireEvent.change(screen.getByLabelText('Departure'), { target: { value: '2026-10-10' } });
    fireEvent.change(screen.getByLabelText('Return'), { target: { value: '2026-10-17' } });
    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '25000' } });
    fireEvent.change(screen.getByLabelText('Adults'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Children ages'), { target: { value: '4, 8' } });
    fireEvent.change(screen.getByLabelText('Interests'), {
      target: { value: 'history, food' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save planning brief' }));

    await waitFor(() => expect(mocks.createBudgetPlanRequest).toHaveBeenCalledTimes(1));
    expect(mocks.createBudgetPlanRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        originLabel: 'Stockholm',
        flexibleDates: false,
        fixedDeparture: '2026-10-10',
        fixedReturn: '2026-10-17',
        budgetAmount: 25000,
        budgetCurrencyCode: 'SEK',
        adults: 2,
        childrenAges: [4, 8],
        interests: ['history', 'food'],
        safetyReservePercent: 7.5,
        accommodation: expect.objectContaining({
          types: ['HOTEL', 'GUEST_HOUSE', 'HOSTEL', 'SHORT_TERM_RENTAL'],
        }),
      }),
    );
    expect(await screen.findByText('Planning brief saved')).toBeInTheDocument();
    expect(screen.getByText('25000 SEK')).toBeInTheDocument();
    expect(screen.getByText('2026-10-10 – 2026-10-17')).toBeInTheDocument();
  });

  it('rejects an incomplete flexible window before calling the server', async () => {
    render(<BudgetPlannerPage copy={copy} defaultCurrency="SEK" />);
    await screen.findByText('No saved planning briefs yet.');

    fireEvent.change(screen.getByLabelText('Where are you travelling from?'), {
      target: { value: 'Stockholm' },
    });
    fireEvent.change(screen.getByLabelText('Earliest departure (optional)'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '12000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save planning brief' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please check the highlighted planning details.',
    );
    expect(mocks.createBudgetPlanRequest).not.toHaveBeenCalled();
  });

  it('shows an authentication action without exposing API details and retries draft loading', async () => {
    mocks.listBudgetPlanRequests
      .mockRejectedValueOnce(
        new ApiClientError('private server detail', {
          status: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      )
      .mockResolvedValueOnce({ requests: [savedRequest()] });

    render(<BudgetPlannerPage copy={copy} defaultCurrency="SEK" />);

    expect(await screen.findByText('Sign in to save and view private planning briefs.')).toBeInTheDocument();
    expect(screen.queryByText('private server detail')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');

    // A fresh render is not needed to recover from a generic outage: the visible
    // retry control exercises the same owner-scoped API contract.
    mocks.listBudgetPlanRequests.mockRejectedValueOnce(new Error('provider internals'));
  });

  it('retries a private draft-list outage without leaking the underlying error', async () => {
    mocks.listBudgetPlanRequests
      .mockRejectedValueOnce(new Error('database hostname must stay private'))
      .mockResolvedValueOnce({ requests: [savedRequest()] });

    render(<BudgetPlannerPage copy={copy} defaultCurrency="SEK" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your planning briefs could not be loaded right now.',
    );
    expect(screen.queryByText(/database hostname/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('25000 SEK')).toBeInTheDocument();
    expect(mocks.listBudgetPlanRequests).toHaveBeenCalledTimes(2);
  });
});
