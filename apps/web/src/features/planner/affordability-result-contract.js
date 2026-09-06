const EVALUATED_BUDGET_FITS = new Set(['COMFORTABLE', 'TIGHT', 'OVER_BUDGET']);
const PRICING_BASES = new Set(['LIVE', 'VERIFIED_PRICE']);
const CONFIDENCE = new Set(['LOW', 'MEDIUM', 'HIGH']);

function moneyToCents(value) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) return null;
  const [whole, fraction] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getCompleteEvidenceTotals(evidence, expectedCurrency) {
  if (
    evidence.status !== 'COMPLETE_EVIDENCE' ||
    !Array.isArray(evidence.required) ||
    evidence.required.length === 0 ||
    !Array.isArray(evidence.collected) ||
    !Array.isArray(evidence.missingCategories) ||
    evidence.missingCategories.length !== 0 ||
    evidence.collected.length !== evidence.required.length
  ) {
    return null;
  }

  const requiredCategories = new Set();
  for (const item of evidence.required) {
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

  const collectedCategories = new Set();
  let totalMin = 0;
  let totalMax = 0;
  for (const item of evidence.collected) {
    const amountMin = moneyToCents(item?.amountMin);
    const amountMax = moneyToCents(item?.amountMax);
    if (
      !item ||
      !requiredCategories.has(item.category) ||
      collectedCategories.has(item.category) ||
      item.amountScope !== 'PLANNER_CATEGORY_TOTAL' ||
      amountMin === null ||
      amountMax === null ||
      amountMax < amountMin ||
      item.currencyCode !== expectedCurrency ||
      !PRICING_BASES.has(item.pricingBasis) ||
      !CONFIDENCE.has(item.confidence) ||
      !isNonEmptyString(item.sourceProvider) ||
      !isNonEmptyString(item.sourceExternalId) ||
      typeof item.sourceFetchedAt !== 'string' ||
      Number.isNaN(Date.parse(item.sourceFetchedAt)) ||
      item.verifiedMarketEvidence !== true
    ) {
      return null;
    }
    collectedCategories.add(item.category);
    totalMin += amountMin;
    totalMax += amountMax;
    if (!Number.isSafeInteger(totalMin) || !Number.isSafeInteger(totalMax)) return null;
  }

  if (collectedCategories.size !== requiredCategories.size) return null;
  return { totalMin, totalMax };
}

function isValidEvaluationPolicy(policy) {
  if (
    !policy ||
    policy.policyKey !== 'attravoya-affordability-evaluation-v1' ||
    policy.policyVersion !== 1 ||
    policy.status !== 'EVALUATED' ||
    policy.comparisonBasis !== 'SPENDABLE_BUDGET' ||
    policy.safetyReserveProtected !== true ||
    typeof policy.currencyCode !== 'string' ||
    !/^[A-Z]{3}$/.test(policy.currencyCode)
  ) {
    return false;
  }

  const spendable = moneyToCents(policy.spendableBudget);
  const amountMin = moneyToCents(policy.totalEvidenceRange?.amountMin);
  const amountMax = moneyToCents(policy.totalEvidenceRange?.amountMax);
  return spendable !== null && amountMin !== null && amountMax !== null && amountMax >= amountMin;
}

export function isSafeAffordabilityEvaluation(evidence, evaluation) {
  if (!evaluation || evaluation.rankingEligible !== false) return false;

  if (evaluation.budgetFit === 'NOT_EVALUATED') {
    return (
      evaluation.affordabilityConfirmed === false &&
      evaluation.evidenceReady === false &&
      evidence.status === 'INSUFFICIENT_EVIDENCE'
    );
  }

  if (!EVALUATED_BUDGET_FITS.has(evaluation.budgetFit)) return false;
  if (evaluation.evidenceReady !== true || !isValidEvaluationPolicy(evaluation.evaluationPolicy)) {
    return false;
  }

  const policy = evaluation.evaluationPolicy;
  const evidenceTotals = getCompleteEvidenceTotals(evidence, policy.currencyCode);
  if (!evidenceTotals) return false;

  const spendable = moneyToCents(policy.spendableBudget);
  const amountMin = moneyToCents(policy.totalEvidenceRange.amountMin);
  const amountMax = moneyToCents(policy.totalEvidenceRange.amountMax);
  if (
    spendable === null ||
    amountMin === null ||
    amountMax === null ||
    evidenceTotals.totalMin !== amountMin ||
    evidenceTotals.totalMax !== amountMax
  ) {
    return false;
  }

  if (evaluation.budgetFit === 'COMFORTABLE') {
    return evaluation.affordabilityConfirmed === true && amountMax <= spendable;
  }
  if (evaluation.affordabilityConfirmed !== false) return false;
  if (evaluation.budgetFit === 'TIGHT') return amountMin <= spendable && amountMax > spendable;
  return amountMin > spendable;
}
