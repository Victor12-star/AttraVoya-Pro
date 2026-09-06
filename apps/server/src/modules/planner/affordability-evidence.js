const POLICY_KEY = 'attravoya-affordability-evidence-v1';

function positivePlanningTargets(targets) {
  return targets.filter((target) => Number(target.amount) > 0);
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
    },
    evaluation: {
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
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
