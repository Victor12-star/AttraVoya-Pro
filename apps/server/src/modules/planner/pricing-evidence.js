const ACCEPTED_PRICING_BASES = new Set(['LIVE', 'VERIFIED_PRICE']);
const ACCEPTED_CONFIDENCE = new Set(['LOW', 'MEDIUM', 'HIGH']);
const VERIFIED_COST_CATEGORY_LABELS = Object.freeze({
  FLIGHTS: 'Flight',
  ACCOMMODATION: 'Accommodation',
  FOOD: 'Food',
  LOCAL_TRANSPORT: 'Local transport',
  ACTIVITIES: 'Activities',
  CHILDREN_ACTIVITIES: 'Children activities',
  AIRPORT_TRANSFER: 'Airport transfer',
  TRAVEL_INSURANCE: 'Travel insurance',
});
const MAX_MONEY_AMOUNT = 1_000_000_000;

function boundedText(value, fieldName, maxLength) {
  if (typeof value !== 'string') throw new TypeError(`${fieldName} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new TypeError(`${fieldName} is invalid.`);
  }
  return normalized;
}

function currencyCode(value) {
  const normalized = boundedText(value, 'currencyCode', 3).toUpperCase();
  if (normalized.length !== 3) throw new TypeError('currencyCode is invalid.');

  for (const character of normalized) {
    if (character < 'A' || character > 'Z') throw new TypeError('currencyCode is invalid.');
  }
  return normalized;
}

function money(value, fieldName) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > MAX_MONEY_AMOUNT) {
    throw new TypeError(`${fieldName} must be a valid non-negative money amount.`);
  }
  return numeric.toFixed(2);
}

function sourceTimestamp(value) {
  const normalized = boundedText(value, 'sourceFetchedAt', 64);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new TypeError('sourceFetchedAt is invalid.');
  return parsed.toISOString();
}

export function normalizePlannerCategoryPricingEvidence(
  rawEvidence,
  expectedCurrencyCode,
  category,
) {
  const label = VERIFIED_COST_CATEGORY_LABELS[category];
  if (!label) throw new TypeError('Verified cost evidence category is not supported.');
  if (!rawEvidence || typeof rawEvidence !== 'object' || Array.isArray(rawEvidence)) {
    throw new TypeError(`${label} pricing evidence must be an object.`);
  }

  const normalizedCurrency = currencyCode(rawEvidence.currencyCode);
  const expectedCurrency = currencyCode(expectedCurrencyCode);
  if (normalizedCurrency !== expectedCurrency) {
    throw new TypeError(`${label} pricing evidence must use the planner budget currency.`);
  }

  if (!ACCEPTED_PRICING_BASES.has(rawEvidence.pricingBasis)) {
    throw new TypeError(`${label} pricing evidence must be live or verified-price evidence.`);
  }
  if (!ACCEPTED_CONFIDENCE.has(rawEvidence.confidence)) {
    throw new TypeError(`${label} pricing evidence confidence is invalid.`);
  }

  const amountMin = money(rawEvidence.amountMin, 'amountMin');
  const amountMax = money(rawEvidence.amountMax, 'amountMax');
  if (Number(amountMax) < Number(amountMin)) {
    throw new TypeError(`${label} pricing evidence maximum cannot be below its minimum.`);
  }

  return {
    category,
    amountScope: 'PLANNER_CATEGORY_TOTAL',
    amountMin,
    amountMax,
    currencyCode: normalizedCurrency,
    pricingBasis: rawEvidence.pricingBasis,
    confidence: rawEvidence.confidence,
    sourceProvider: boundedText(rawEvidence.sourceProvider, 'sourceProvider', 80),
    sourceExternalId: boundedText(rawEvidence.sourceExternalId, 'sourceExternalId', 200),
    sourceFetchedAt: sourceTimestamp(rawEvidence.sourceFetchedAt),
    verifiedMarketEvidence: true,
  };
}

export function normalizeAccommodationPricingEvidence(rawEvidence, expectedCurrencyCode) {
  return normalizePlannerCategoryPricingEvidence(
    rawEvidence,
    expectedCurrencyCode,
    'ACCOMMODATION',
  );
}

export function normalizeFlightPricingEvidence(rawEvidence, expectedCurrencyCode) {
  return normalizePlannerCategoryPricingEvidence(rawEvidence, expectedCurrencyCode, 'FLIGHTS');
}
