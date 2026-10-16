const POLICY_KEY = 'attravoya-affordability-evidence-v1';
const PRICING_COLLECTION_STATUSES = new Set([
  'COLLECTED',
  'NOT_CONFIGURED',
  'UNAVAILABLE',
  'FAILED',
]);
const VERIFIED_COST_CATEGORIES = new Set([
  'FLIGHTS',
  'ACCOMMODATION',
  'FOOD',
  'LOCAL_TRANSPORT',
  'ACTIVITIES',
  'CHILDREN_ACTIVITIES',
  'AIRPORT_TRANSFER',
  'TRAVEL_INSURANCE',
]);

function positivePlanningTargets(targets) {
  return targets.filter((target) => Number(target.amount) > 0);
}

function evidenceStatus(required) {
  return required.every((item) => item.status === 'COLLECTED')
    ? 'COMPLETE_EVIDENCE'
    : 'INSUFFICIENT_EVIDENCE';
}

export function applyMarketPricingCollection(gate, category, collection) {
  if (!collection || !PRICING_COLLECTION_STATUSES.has(collection.status)) {
    throw new TypeError('Pricing collection status is invalid.');
  }
  if (!VERIFIED_COST_CATEGORIES.has(category)) {
    throw new TypeError('Verified cost collection category is not supported.');
  }
  if (!gate.evidence.required.some((item) => item.category === category)) {
    throw new TypeError('Pricing category is not required by the current plan.');
  }

  if (collection.status === 'COLLECTED' && collection.evidence?.category !== category) {
    throw new TypeError('Collected pricing evidence category does not match the request.');
  }

  const collectedEvidence = collection.status === 'COLLECTED' ? collection.evidence : null;
  const required = gate.evidence.required.map((item) =>
    item.category === category ? { ...item, status: collection.status } : item,
  );
  // A repeated collection replaces the prior category result, including failed retries.
  const otherEvidence = gate.evidence.collected.filter((item) => item.category !== category);
  const collected = collectedEvidence ? [...otherEvidence, collectedEvidence] : otherEvidence;
  const missingCategories = required
    .filter((item) => item.status !== 'COLLECTED')
    .map((item) => item.category);

  return {
    ...gate,
    evidence: {
      ...gate.evidence,
      status: evidenceStatus(required),
      required,
      collected,
      missingCategories,
      collectionAttempts: [
        ...(gate.evidence.collectionAttempts ?? []),
        {
          category,
          status: collection.status,
        },
      ],
    },
    evaluation: {
      ...gate.evaluation,
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: missingCategories.length === 0,
      evaluationPolicy: undefined,
    },
    provenance: {
      ...gate.provenance,
      liveDataUsed: collected.some((item) => item.pricingBasis === 'LIVE'),
      providerDataUsed: collected.length > 0,
      pricingDataUsed: collected.length > 0,
      statement:
        collected.length > 0
          ? 'Verified cost evidence was collected server-side for one or more planner categories, but affordability and ranking remain unevaluated until the full required evidence set is available and evaluated.'
          : 'No current market pricing evidence is retained for this plan. Affordability and ranking remain unevaluated until the full required evidence set is collected and evaluated.',
    },
  };
}

export function buildAffordabilityEvidenceGate({ planRequest, destination, budgetEnvelope }) {
  const requiredEvidence = positivePlanningTargets(budgetEnvelope.targets).map((target) => ({
    category: target.category,
    targetAmount: target.amount,
    targetBasis: target.basis,
    status: 'NOT_COLLECTED',
  }));

  return {
    requestId: planRequest.id,
    destination,
    searchContext: {
      origin: planRequest.origin,
      dates: planRequest.dates,
      travellers: planRequest.travellers,
      interests: planRequest.interests,
      comfortLevel: planRequest.comfortLevel,
      accommodation: planRequest.accommodation,
      budget: {
        currencyCode: budgetEnvelope.currencyCode,
        totalBudget: budgetEnvelope.totalBudget,
        safetyReserve: budgetEnvelope.safetyReserve,
        spendableBudget: budgetEnvelope.spendableBudget,
        planningTargets: budgetEnvelope.targets,
        provenance: budgetEnvelope.provenance,
      },
    },
    evidence: {
      policyKey: POLICY_KEY,
      policyVersion: 1,
      status: 'INSUFFICIENT_EVIDENCE',
      required: requiredEvidence,
      collected: [],
      missingCategories: requiredEvidence.map((item) => item.category),
      collectionAttempts: [],
    },
    evaluation: {
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
    },
    provenance: {
      kind: 'AFFORDABILITY_EVIDENCE_GATE',
      sources: [
        'TRAVELLER_SAVED_PLANNER_REQUEST',
        'ATTRAVOYA_PLANNING_TARGET_ENVELOPE',
        'ATTRAVOYA_PUBLISHED_DESTINATION_CATALOG',
      ],
      liveDataUsed: false,
      providerDataUsed: false,
      pricingDataUsed: false,
      statement:
        'This payload prepares verified planner inputs for future affordability evidence collection. It contains no market prices, fares, quotes, availability, provider results, or affordability conclusion.',
    },
  };
}
