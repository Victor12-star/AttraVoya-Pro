import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPlannerAffordabilityEvidence: vi.fn(),
  getPlannerDestinationCandidates: vi.fn(),
  listBudgetPlanRequests: vi.fn(),
}));

vi.mock('../../src/lib/api-client.js', () => ({
  apiClient: {
    getPlannerAffordabilityEvidence: mocks.getPlannerAffordabilityEvidence,
    getPlannerDestinationCandidates: mocks.getPlannerDestinationCandidates,
    listBudgetPlanRequests: mocks.listBudgetPlanRequests,
  },
}));

const { CandidateEvidenceSection } =
  await import('../../src/features/planner/candidate-evidence-section.jsx');
const { CANDIDATE_EVIDENCE_LOCALES, getCandidateEvidenceCopy } =
  await import('../../src/features/planner/candidate-evidence-copy.js');
const { getBudgetPlannerCopy } = await import('../../src/features/planner/budget-planner-copy.js');

const copy = getCandidateEvidenceCopy('en');
const plannerCopy = getBudgetPlannerCopy('en');

function savedRequest() {
  return {
    id: 'request-1',
    origin: { label: 'Stockholm', cityId: 'city-stockholm', airportId: null },
    budget: { amount: '1000', currencyCode: 'EUR', safetyReservePercent: '10' },
    status: 'DRAFT',
  };
}

function candidateSet(overrides = {}) {
  return {
    requestId: 'request-1',
    mode: 'PUBLISHED_CATALOG',
    destinations: [
      {
        id: 'destination-lisbon',
        slug: 'lisbon-portugal',
        name: 'Lisbon',
        regionName: 'Lisbon District',
        country: { code: 'PT', name: 'Portugal' },
        summary: 'Published destination summary.',
      },
    ],
    evaluation: {
      budgetFit: 'NOT_EVALUATED',
      rankingApplied: false,
      priceDataAvailable: false,
      availabilityDataUsed: false,
    },
    provenance: {
      kind: 'PUBLISHED_CATALOG_CANDIDATE',
      source: 'ATTRAVOYA_PUBLISHED_DESTINATION_CATALOG',
      liveDataUsed: false,
      providerDataUsed: false,
      pricingDataUsed: false,
    },
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    requestId: 'request-1',
    destination: candidateSet().destinations[0],
    evidence: {
      policyKey: 'attravoya-affordability-evidence-v1',
      policyVersion: 1,
      status: 'INSUFFICIENT_EVIDENCE',
      required: [
        {
          category: 'FLIGHTS',
          targetAmount: '270.00',
          targetBasis: 'PLANNING_TARGET',
          status: 'NOT_CONFIGURED',
        },
        {
          category: 'ACCOMMODATION',
          targetAmount: '288.00',
          targetBasis: 'PLANNING_TARGET',
          status: 'COLLECTED',
        },
      ],
      collected: [
        {
          category: 'ACCOMMODATION',
          amountScope: 'PLANNER_CATEGORY_TOTAL',
          amountMin: '240.00',
          amountMax: '280.50',
          currencyCode: 'EUR',
          pricingBasis: 'VERIFIED_PRICE',
          confidence: 'HIGH',
          sourceProvider: 'verified-accommodation-test',
          sourceExternalId: 'property-123',
          sourceFetchedAt: '2026-09-06T07:30:00.000Z',
          verifiedMarketEvidence: true,
        },
      ],
      missingCategories: ['FLIGHTS'],
      collectionAttempts: [
        { category: 'FLIGHTS', status: 'NOT_CONFIGURED' },
        { category: 'ACCOMMODATION', status: 'COLLECTED' },
      ],
    },
    evaluation: {
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
    },
    provenance: {
      kind: 'AFFORDABILITY_EVIDENCE_GATE',
      liveDataUsed: false,
      providerDataUsed: true,
      pricingDataUsed: true,
    },
    ...overrides,
  };
}

function evaluatedEvidence() {
  const categories = [
    'FLIGHTS',
    'ACCOMMODATION',
    'FOOD',
    'LOCAL_TRANSPORT',
    'ACTIVITIES',
    'CHILDREN_ACTIVITIES',
    'AIRPORT_TRANSFER',
    'TRAVEL_INSURANCE',
  ];

  return {
    ...evidence(),
    evidence: {
      policyKey: 'attravoya-affordability-evidence-v1',
      policyVersion: 1,
      status: 'COMPLETE_EVIDENCE',
      required: categories.map((category) => ({
        category,
        targetAmount: '100.00',
        targetBasis: 'PLANNING_TARGET',
        status: 'COLLECTED',
      })),
      collected: categories.map((category, index) => ({
        category,
        amountScope: 'PLANNER_CATEGORY_TOTAL',
        amountMin: index === 0 ? '180.00' : '80.00',
        amountMax: index === 0 ? '220.00' : '90.00',
        currencyCode: 'EUR',
        pricingBasis: 'VERIFIED_PRICE',
        confidence: 'HIGH',
        sourceProvider: `verified-${category.toLowerCase()}-test`,
        sourceExternalId: `evidence-${index}`,
        sourceFetchedAt: '2026-09-06T16:00:00.000Z',
        verifiedMarketEvidence: true,
      })),
      missingCategories: [],
      collectionAttempts: categories.map((category) => ({ category, status: 'COLLECTED' })),
    },
    evaluation: {
      budgetFit: 'COMFORTABLE',
      rankingEligible: false,
      affordabilityConfirmed: true,
      evidenceReady: true,
      evaluationPolicy: {
        policyKey: 'attravoya-affordability-evaluation-v1',
        policyVersion: 1,
        status: 'EVALUATED',
        comparisonBasis: 'SPENDABLE_BUDGET',
        safetyReserveProtected: true,
        currencyCode: 'EUR',
        spendableBudget: '900.00',
        totalEvidenceRange: { amountMin: '740.00', amountMax: '850.00' },
      },
    },
    provenance: {
      kind: 'AFFORDABILITY_EVIDENCE_GATE',
      liveDataUsed: true,
      providerDataUsed: true,
      pricingDataUsed: true,
    },
  };
}

async function selectSavedBrief() {
  await screen.findByText(copy.notSelected);
  fireEvent.change(screen.getByLabelText(copy.selectLabel), {
    target: { value: 'request-1' },
  });
  await screen.findByText('Lisbon');
}

describe('CandidateEvidenceSection', () => {
  beforeEach(() => {
    mocks.getPlannerAffordabilityEvidence.mockReset();
    mocks.getPlannerDestinationCandidates.mockReset();
    mocks.listBudgetPlanRequests.mockReset();
    mocks.listBudgetPlanRequests.mockResolvedValue({ requests: [savedRequest()] });
    mocks.getPlannerDestinationCandidates.mockResolvedValue({
      destinationCandidates: candidateSet(),
    });
    mocks.getPlannerAffordabilityEvidence.mockResolvedValue({
      affordabilityEvidence: evidence(),
    });
  });

  it('provides candidate evidence copy for all 18 supported UI locales', () => {
    expect(CANDIDATE_EVIDENCE_LOCALES).toEqual([
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

    for (const locale of CANDIDATE_EVIDENCE_LOCALES) {
      const localized = getCandidateEvidenceCopy(locale);
      expect(localized.title).toBeTruthy();
      expect(localized.notRanked).toBeTruthy();
      expect(localized.notAffordableYet).toBeTruthy();
      expect(localized.statuses.NOT_CONFIGURED).toBeTruthy();
      expect(Object.keys(localized.categories)).toHaveLength(8);
    }
  });

  it('shows unranked catalog candidates and waits for explicit evidence inspection', async () => {
    render(<CandidateEvidenceSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    await selectSavedBrief();

    expect(mocks.getPlannerDestinationCandidates).toHaveBeenCalledWith('request-1');
    expect(mocks.getPlannerAffordabilityEvidence).not.toHaveBeenCalled();
    expect(screen.getAllByText(copy.notRanked).length).toBeGreaterThan(0);
    expect(screen.getAllByText(copy.notAffordableYet).length).toBeGreaterThan(0);
    expect(screen.getByText('Published destination summary.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: copy.inspect }));

    expect(await screen.findByText('verified-accommodation-test')).toBeInTheDocument();
    expect(mocks.getPlannerAffordabilityEvidence).toHaveBeenCalledWith(
      'request-1',
      'destination-lisbon',
    );
    expect(screen.getByText('240.00–280.50 EUR')).toBeInTheDocument();
    expect(screen.getByText(copy.statuses.NOT_CONFIGURED)).toBeInTheDocument();
    expect(screen.getAllByText(copy.notAffordableYet).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/book now|best destination|recommended for you/i),
    ).not.toBeInTheDocument();
  });

  it('shows a verified comfortable budget-fit result without ranking or booking claims', async () => {
    mocks.getPlannerAffordabilityEvidence.mockResolvedValue({
      affordabilityEvidence: evaluatedEvidence(),
    });

    render(<CandidateEvidenceSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    await selectSavedBrief();
    fireEvent.click(screen.getByRole('button', { name: copy.inspect }));

    expect(await screen.findByText('Within spendable budget')).toBeInTheDocument();
    expect(screen.getByText('740.00–850.00 EUR')).toBeInTheDocument();
    expect(screen.getByText('900.00 EUR')).toBeInTheDocument();
    expect(screen.getAllByText(copy.notRanked).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/book now|best destination|recommended for you/i),
    ).not.toBeInTheDocument();
  });

  it('rejects a candidate payload that claims ranking or pricing evaluation', async () => {
    mocks.getPlannerDestinationCandidates.mockResolvedValue({
      destinationCandidates: candidateSet({
        evaluation: {
          budgetFit: 'AFFORDABLE',
          rankingApplied: true,
          priceDataAvailable: true,
          availabilityDataUsed: false,
        },
      }),
    });

    render(<CandidateEvidenceSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    await screen.findByText(copy.notSelected);
    fireEvent.change(screen.getByLabelText(copy.selectLabel), {
      target: { value: 'request-1' },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.candidatesUnavailable);
    expect(screen.queryByText('Lisbon')).not.toBeInTheDocument();
  });

  it('rejects evidence that tries to unlock affordability or ranking', async () => {
    mocks.getPlannerAffordabilityEvidence.mockResolvedValue({
      affordabilityEvidence: evidence({
        evaluation: {
          budgetFit: 'AFFORDABLE',
          rankingEligible: true,
          affordabilityConfirmed: true,
          evidenceReady: true,
        },
      }),
    });

    render(<CandidateEvidenceSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    await selectSavedBrief();
    fireEvent.click(screen.getByRole('button', { name: copy.inspect }));

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.evidenceUnavailable);
    expect(screen.queryByText('verified-accommodation-test')).not.toBeInTheDocument();
  });

  it('keeps provider errors private and supports evidence retry', async () => {
    mocks.getPlannerAffordabilityEvidence
      .mockRejectedValueOnce(new Error('private provider response body'))
      .mockResolvedValueOnce({ affordabilityEvidence: evidence() });

    render(<CandidateEvidenceSection copy={copy} locale="en" plannerCopy={plannerCopy} />);

    await selectSavedBrief();
    fireEvent.click(screen.getByRole('button', { name: copy.inspect }));

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.evidenceUnavailable);
    expect(screen.queryByText(/private provider response body/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: plannerCopy.retry }));
    await waitFor(() => expect(mocks.getPlannerAffordabilityEvidence).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('verified-accommodation-test')).toBeInTheDocument();
  });
});
