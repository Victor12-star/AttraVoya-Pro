/**
 * Compare fully evaluated holiday cost ranges conservatively.
 * This is not an offer search or a claim that prices are currently available.
 * Only comparable evidence for the same party, dates, currency and scope
 * may enter the ranking. Incomplete/unevaluated entries remain unranked.
 */
function moneyInCents(value) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) return null;
  const [whole, fraction] = value.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction);
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}

export function compareVerifiedHolidayRanges(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Holiday entries must be an array.');

  const eligible = [];
  const unranked = [];
  let reference = null;

  for (const entry of entries) {
    const policy = entry?.evaluation?.evaluationPolicy;
    const range = policy?.totalEvidenceRange;
    const min = moneyInCents(range?.amountMin);
    const max = moneyInCents(range?.amountMax);
    const currency = policy?.currencyCode;
    const key = entry?.comparisonKey;
    const categories = entry?.evidence?.required?.map((item) => item?.category);
    const signature = Array.isArray(categories) ? [...categories].sort().join('|') : null;
    const valid =
      typeof entry?.destinationId === 'string' &&
      entry.destinationId.length > 0 &&
      typeof key === 'string' &&
      key.length > 0 &&
      typeof currency === 'string' &&
      /^[A-Z]{3}$/.test(currency) &&
      policy?.status === 'EVALUATED' &&
      entry?.evaluation?.evidenceReady === true &&
      entry?.evidence?.status === 'COMPLETE_EVIDENCE' &&
      Array.isArray(categories) &&
      categories.length > 0 &&
      min !== null &&
      max !== null &&
      max >= min;
    const basis = valid
      ? `${key}:${currency}:${policy.spendableBudget}:${signature}`
      : null;

    if (!valid || (reference !== null && reference !== basis)) {
      unranked.push({ destinationId: entry?.destinationId ?? null, reason: valid ? 'INCOMPARABLE_BASIS' : 'UNVERIFIED_EVIDENCE' });
      continue;
    }

    reference ??= basis;
    eligible.push({
      destinationId: entry.destinationId,
      currencyCode: currency,
      amountMin: range.amountMin,
      amountMax: range.amountMax,
      upperBoundCents: max,
      lowerBoundCents: min,
    });
  }

  eligible.sort(
    (a, b) =>
      a.upperBoundCents - b.upperBoundCents ||
      a.lowerBoundCents - b.lowerBoundCents ||
      a.destinationId.localeCompare(b.destinationId),
  );

  return {
    ordering: 'LOWEST_VERIFIED_UPPER_BOUND_FIRST',
    priceDataAvailable: eligible.length > 0,
    rankingApplied: eligible.length > 1,
    ranked: eligible.map((item) => ({
      destinationId: item.destinationId,
      currencyCode: item.currencyCode,
      amountMin: item.amountMin,
      amountMax: item.amountMax,
    })),
    unranked,
    disclaimer:
      'Verified price ranges are compared by their upper bounds; overlapping ranges do not establish which holiday will actually be cheapest. These are not bookings or live availability.',
  };
}
