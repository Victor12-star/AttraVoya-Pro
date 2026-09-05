const POLICY_KEY = 'attravoya-budget-envelope-v1';

// These weights are a transparent product-planning heuristic, not market data.
// They divide only the traveller's own spendable budget so later provider-backed
// recommendation work has explicit category targets without inventing prices.
const BASE_TARGETS = Object.freeze([
  Object.freeze({ category: 'FLIGHTS', weightPercent: 30 }),
  Object.freeze({ category: 'ACCOMMODATION', weightPercent: 32 }),
  Object.freeze({ category: 'FOOD', weightPercent: 15 }),
  Object.freeze({ category: 'LOCAL_TRANSPORT', weightPercent: 8 }),
  Object.freeze({ category: 'ACTIVITIES', weightPercent: 7 }),
  Object.freeze({ category: 'CHILDREN_ACTIVITIES', weightPercent: 3 }),
  Object.freeze({ category: 'AIRPORT_TRANSFER', weightPercent: 3 }),
  Object.freeze({ category: 'TRAVEL_INSURANCE', weightPercent: 2 }),
]);

function decimalToScaledInteger(value, scaleDigits, label) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new TypeError(`${label} must be a non-negative decimal value.`);
  }

  const [whole, fraction = ''] = normalized.split('.');
  const scale = 10 ** scaleDigits;
  const paddedFraction = `${fraction}${'0'.repeat(scaleDigits)}`.slice(0, scaleDigits);
  let scaled = Number(whole) * scale + Number(paddedFraction || 0);
  const roundingDigit = fraction.charAt(scaleDigits);
  if (roundingDigit && Number(roundingDigit) >= 5) scaled += 1;

  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError(`${label} is outside the supported planning range.`);
  }
  return scaled;
}

function formatScaledInteger(value, scaleDigits) {
  const scale = 10 ** scaleDigits;
  const whole = Math.floor(value / scale);
  const fraction = String(value % scale).padStart(scaleDigits, '0');
  return `${whole}.${fraction}`;
}

function buildTargets({ spendableCents, hasChildren }) {
  const weights = BASE_TARGETS.map((target) => ({ ...target }));
  if (!hasChildren) {
    const childTarget = weights.find((target) => target.category === 'CHILDREN_ACTIVITIES');
    const activitiesTarget = weights.find((target) => target.category === 'ACTIVITIES');
    activitiesTarget.weightPercent += childTarget.weightPercent;
    childTarget.weightPercent = 0;
  }

  const targets = weights.map((target) => ({
    ...target,
    amountCents: Math.floor((spendableCents * target.weightPercent) / 100),
  }));

  const assignedCents = targets.reduce((sum, target) => sum + target.amountCents, 0);
  const roundingRemainder = spendableCents - assignedCents;
  if (roundingRemainder > 0) {
    const accommodation = targets.find((target) => target.category === 'ACCOMMODATION');
    accommodation.amountCents += roundingRemainder;
  }

  return targets;
}

export function buildBudgetEnvelope(record) {
  const totalCents = decimalToScaledInteger(record.budgetAmount, 2, 'Budget amount');
  const reserveBasisPoints = decimalToScaledInteger(
    record.safetyReservePercent,
    2,
    'Safety reserve percent',
  );
  if (reserveBasisPoints > 10_000) {
    throw new RangeError('Safety reserve percent cannot exceed 100 percent.');
  }

  const reserveCents = Math.round((totalCents * reserveBasisPoints) / 10_000);
  const spendableCents = totalCents - reserveCents;
  const targets = buildTargets({
    spendableCents,
    hasChildren: Array.isArray(record.childrenAges) && record.childrenAges.length > 0,
  });

  return {
    requestId: record.id,
    currencyCode: record.budgetCurrency.code,
    totalBudget: formatScaledInteger(totalCents, 2),
    safetyReserve: {
      category: 'SAFETY_RESERVE',
      amount: formatScaledInteger(reserveCents, 2),
      percentOfTotal: formatScaledInteger(reserveBasisPoints, 2),
      basis: 'USER_INPUT_DERIVED',
    },
    spendableBudget: formatScaledInteger(spendableCents, 2),
    targets: targets.map(({ category, weightPercent, amountCents }) => ({
      category,
      amount: formatScaledInteger(amountCents, 2),
      percentOfSpendable: formatScaledInteger(weightPercent * 100, 2),
      basis: 'PLANNING_TARGET',
    })),
    provenance: {
      kind: 'PLANNING_TARGET',
      policyKey: POLICY_KEY,
      policyVersion: 1,
      liveDataUsed: false,
      providerDataUsed: false,
      statement:
        "Targets divide the traveller's saved budget after their safety reserve. They are not fares, prices, quotes, availability, or destination-specific cost estimates.",
    },
  };
}
