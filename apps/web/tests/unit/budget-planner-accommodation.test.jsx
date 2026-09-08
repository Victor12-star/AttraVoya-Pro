import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createBudgetPlanRequest: vi.fn(),
  listBudgetPlanRequests: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    createBudgetPlanRequest: mocks.createBudgetPlanRequest,
    listBudgetPlanRequests: mocks.listBudgetPlanRequests,
  },
}));

const { BudgetPlannerPage } = await import('../../src/features/planner/budget-planner-page.jsx');
const { getBudgetPlannerCopy } = await import('../../src/features/planner/budget-planner-copy.js');

const copy = getBudgetPlannerCopy('en');

function savedRequest() {
  return {
    id: 'request-accommodation-range',
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
    budget: { amount: '12000', currencyCode: 'SEK', safetyReservePercent: '7.5' },
    travellers: { adults: 1, childrenAges: [] },
    interests: [],
    comfortLevel: 'BUDGET',
    accommodation: {
      types: ['HOSTEL', 'BUDGET_HOTEL', 'GUEST_HOUSE'],
      unitType: 'SHARED_ROOM',
      maxNightlyAmount: '500.00',
      maxTotalStayAmount: '3000.00',
    },
    status: 'DRAFT',
    createdAt: '2026-09-08T11:00:00.000Z',
    updatedAt: '2026-09-08T11:00:00.000Z',
  };
}

function fillRequiredPlan() {
  fireEvent.change(screen.getByLabelText('Where are you travelling from?'), {
    target: { value: 'Stockholm' },
  });
  fireEvent.click(screen.getByLabelText('I know my dates'));
  fireEvent.change(screen.getByLabelText('Departure'), { target: { value: '2026-10-10' } });
  fireEvent.change(screen.getByLabelText('Return'), { target: { value: '2026-10-17' } });
  fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '12000' } });
}

describe('BudgetPlannerPage accommodation range', () => {
  beforeEach(() => {
    mocks.createBudgetPlanRequest.mockReset();
    mocks.listBudgetPlanRequests.mockReset();
    mocks.listBudgetPlanRequests.mockResolvedValue({ requests: [] });
    mocks.createBudgetPlanRequest.mockResolvedValue({ planRequest: savedRequest() });
  });

  it('saves a cheapest-stay strategy with room type and hard accommodation spending limits', async () => {
    render(<BudgetPlannerPage copy={copy} defaultCurrency="SEK" locale="en" />);
    await screen.findByText('No saved planning briefs yet.');

    fillRequiredPlan();
    fireEvent.change(screen.getByLabelText('Accommodation price & comfort range'), {
      target: { value: 'CHEAPEST' },
    });
    fireEvent.change(screen.getByLabelText('Room or stay type'), {
      target: { value: 'SHARED_ROOM' },
    });
    fireEvent.change(screen.getByLabelText('Maximum price per night'), {
      target: { value: '500' },
    });
    fireEvent.change(screen.getByLabelText('Maximum accommodation total'), {
      target: { value: '3000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save planning brief' }));

    await waitFor(() => expect(mocks.createBudgetPlanRequest).toHaveBeenCalledTimes(1));
    expect(mocks.createBudgetPlanRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetAmount: 12000,
        budgetCurrencyCode: 'SEK',
        accommodation: expect.objectContaining({
          types: [
            'HOSTEL',
            'BUDGET_HOTEL',
            'GUEST_HOUSE',
            'BED_AND_BREAKFAST',
            'CAMPSITE',
            'HOLIDAY_PARK',
          ],
          unitType: 'SHARED_ROOM',
          maxNightlyAmount: 500,
          maxTotalStayAmount: 3000,
        }),
      }),
      expect.stringMatching(/^planner-[0-9a-f-]{36}$/),
    );
  });

  it('exposes premium and compare-all ranges without claiming unverified five-star pricing', async () => {
    render(<BudgetPlannerPage copy={copy} defaultCurrency="SEK" locale="en" />);
    await screen.findByText('No saved planning briefs yet.');

    const range = screen.getByLabelText('Accommodation price & comfort range');
    expect(range).toHaveTextContent('Premium / luxury');
    expect(range).toHaveTextContent('Compare everything');
    expect(
      screen.getByText(/official star ratings, including 5-star labels, are shown only when/i),
    ).toBeInTheDocument();
  });
});
