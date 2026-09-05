const POLICY_KEY = 'attravoya-budget-envelope-v1';

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
  const activitiesPercent = hasChildren ? 7 : 10;
  const childrenActivitiesPercent = hasChildren ? 3 : 0;

  // These weights are a transparent product-planning heuristic, not market data.
  // They divide only the traveller's own spendable budget so later provider-backed
  // recommendation work has explicit category targets without inventing prices.
  /** @type {{category: string, weightPercent: number}[]} */
  const weights = [
    { category: 'FLIGHTS', weightPercent: 30 },
    { category: 'ACCOMMODATION', weightPercent: 32 },
    { category: 'FOOD', weightPercent: 15 },
    { category: 'LOCAL_TRANSPORT', weightPercent: 8 },
    { category: 'ACTIVITIES', weightPercent: activitiesPercent },
    { category: 'CHILDREN_ACTIVITIES', weightPercent: childrenActivitiesPercent },
    { category: 'AIRPORT_TRANSFER', weightPercent: 3 },
    { category: 'TRAVEL_INSURANCE', weightPercent: 2 },
  ];

  const targets = weights.map((target) => ({
    ...target,
    amountCents: Math.floor((spendableCents * target.weightPercent) / 100),
  }));
  const assignedCents = targets.reduce((sum, target) => sum + target.amountCents, 0);
  const roundingRemainder = spendableCents - assignedCents;

  // Put unavoidable integer-cent rounding into one stable category so the target
  // amounts always add back to the exact spendable budget.
  return targets.map((target) =>
    target.category === 'ACCOMMODATION'
      ? { ...target, amountCents: target.amountCents + roundingRemainder }
      : target,
  );
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
