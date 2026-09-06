const POLICY_KEY = 'attravoya-affordability-evidence-v1';

function positivePlanningTargets(targets) {
  return targets.filter((target) => Number(target.amount) > 0);
}

function evidenceStatus(required) {
  return required.every((item) => item.status === 'COLLECTED')
    ? 'COMPLETE_EVIDENCE'
    : 'INSUFFICIENT_EVIDENCE';
}

export function applyAccommodationPricingCollection(gate, collection) {
  const collectedEvidence =
    collection.status === 'COLLECTED' ? collection.evidence : null;
  const required = gate.evidence.required.map((item) =>
    item.category === 'ACCOMMODATION'
      ? { ...item, status: collection.status }
      : item,
  );
  const collected = collectedEvidence
    ? [...gate.evidence.collected, collectedEvidence]
    : gate.evidence.collected;
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
          category: 'ACCOMMODATION',
          status: collection.status,
        },
      ],
    },
    evaluation: {
      ...gate.evaluation,
      evidenceReady: missingCategories.length === 0,
    },
    provenance: {
      ...gate.provenance,
      liveDataUsed:
        gate.provenance.liveDataUsed || collectedEvidence?.pricingBasis === 'LIVE',
      providerDataUsed:
        gate.provenance.providerDataUsed || Boolean(collectedEvidence),
      pricingDataUsed: gate.provenance.pricingDataUsed || Boolean(collectedEvidence),
      statement: collectedEvidence
        ? 'Verified accommodation pricing evidence was collected server-side, but affordability and ranking remain unevaluated until the full required evidence set is available and evaluated.'
        : gate.provenance.statement,
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
