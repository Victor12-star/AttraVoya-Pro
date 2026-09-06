const POLICY_KEY = 'attravoya-affordability-evaluation-v1';
const ACCEPTED_PRICING_BASES = new Set(['LIVE', 'VERIFIED_PRICE']);
const ACCEPTED_CONFIDENCE = new Set(['LOW', 'MEDIUM', 'HIGH']);

function moneyToCents(value) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) return null;
  const [whole, fraction] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
}

function formatCents(value) {
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidTimestamp(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function blockedEvaluation(gate, reason) {
  return {
    ...gate,
    evaluation: {
      ...gate.evaluation,
      budgetFit: 'NOT_EVALUATED',
      rankingEligible: false,
      affordabilityConfirmed: false,
      evidenceReady: false,
      evaluationPolicy: {
        policyKey: POLICY_KEY,
        policyVersion: 1,
        status: 'BLOCKED',
        reason,
        comparisonBasis: 'SPENDABLE_BUDGET',
        safetyReserveProtected: true,
      },
    },
    provenance: {
      ...gate.provenance,
      statement:
        'Affordability evaluation was blocked because the complete evidence set failed the evaluation policy. Ranking and affordability confirmation remain disabled.',
    },
  };
}

function validateCompleteEvidence(gate) {
  const required = gate?.evidence?.required;
  const collected = gate?.evidence?.collected;
  const missingCategories = gate?.evidence?.missingCategories;
  const budget = gate?.searchContext?.budget;

  if (
    gate?.evidence?.status !== 'COMPLETE_EVIDENCE' ||
    gate?.evaluation?.evidenceReady !== true ||
    !Array.isArray(required) ||
    required.length === 0 ||
    !Array.isArray(collected) ||
    !Array.isArray(missingCategories) ||
    missingCategories.length !== 0 ||
    !budget ||
    typeof budget.currencyCode !== 'string'
  ) {
    return null;
  }

  const spendableCents = moneyToCents(budget.spendableBudget);
  if (spendableCents === null) return null;

  const requiredCategories = new Set();
  for (const item of required) {
    if (
      !item ||
      !isNonEmptyString(item.category) ||
      item.status !== 'COLLECTED' ||
      item.targetBasis !== 'PLANNING_TARGET' ||
      moneyToCents(item.targetAmount) === null ||
      requiredCategories.has(item.category)
    ) {
      return null;
    }
    requiredCategories.add(item.category);
  }

  if (collected.length !== requiredCategories.size) return null;

  const collectedCategories = new Set();
  let totalMinCents = 0;
  let totalMaxCents = 0;

  for (const item of collected) {
    const amountMinCents = moneyToCents(item?.amountMin);
    const amountMaxCents = moneyToCents(item?.amountMax);
    if (
      !item ||
      !requiredCategories.has(item.category) ||
      collectedCategories.has(item.category) ||
      item.amountScope !== 'PLANNER_CATEGORY_TOTAL' ||
      amountMinCents === null ||
      amountMaxCents === null ||
      amountMaxCents < amountMinCents ||
      item.currencyCode !== budget.currencyCode ||
      !ACCEPTED_PRICING_BASES.has(item.pricingBasis) ||
      !ACCEPTED_CONFIDENCE.has(item.confidence) ||
      !isNonEmptyString(item.sourceProvider) ||
      !isNonEmptyString(item.sourceExternalId) ||
      !isValidTimestamp(item.sourceFetchedAt) ||
      item.verifiedMarketEvidence !== true
    ) {
      return null;
    }

    collectedCategories.add(item.category);
    totalMinCents += amountMinCents;
    totalMaxCents += amountMaxCents;
    if (!Number.isSafeInteger(totalMinCents) || !Number.isSafeInteger(totalMaxCents)) return null;
  }

  return {
    currencyCode: budget.currencyCode,
    spendableCents,
    totalMinCents,
    totalMaxCents,
  };
}

export function evaluateAffordabilityEvidenceGate(gate) {
  if (gate?.evidence?.status !== 'COMPLETE_EVIDENCE' || gate?.evaluation?.evidenceReady !== true) {
    return gate;
  }

  const validated = validateCompleteEvidence(gate);
  if (!validated) return blockedEvaluation(gate, 'INVALID_COMPLETE_EVIDENCE');

  let budgetFit = 'TIGHT';
  if (validated.totalMaxCents <= validated.spendableCents) budgetFit = 'COMFORTABLE';
  else if (validated.totalMinCents > validated.spendableCents) budgetFit = 'OVER_BUDGET';

  return {
    ...gate,
    evaluation: {
      ...gate.evaluation,
      budgetFit,
      rankingEligible: false,
      affordabilityConfirmed: budgetFit === 'COMFORTABLE',
      evidenceReady: true,
      evaluationPolicy: {
        policyKey: POLICY_KEY,
        policyVersion: 1,
        status: 'EVALUATED',
        comparisonBasis: 'SPENDABLE_BUDGET',
        safetyReserveProtected: true,
        currencyCode: validated.currencyCode,
        spendableBudget: formatCents(validated.spendableCents),
        totalEvidenceRange: {
          amountMin: formatCents(validated.totalMinCents),
          amountMax: formatCents(validated.totalMaxCents),
        },
      },
    },
    provenance: {
      ...gate.provenance,
      statement:
        'Budget fit was evaluated only after complete verified category-total evidence was available. The evidence range was compared with the spendable budget after the safety reserve; ranking, availability, and bookability remain separate and disabled.',
    },
  };
}
