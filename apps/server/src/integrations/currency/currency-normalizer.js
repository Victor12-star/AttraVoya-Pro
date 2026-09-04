function normalizeRateRow(row) {
  return {
    date: row?.date ?? null,
    base: String(row?.base ?? '').toUpperCase(),
    quote: String(row?.quote ?? '').toUpperCase(),
    rate: Number(row?.rate),
    providers: Array.isArray(row?.providers) ? row.providers : undefined,
  };
}

/** Frankfurter v2 returns rate rows; keep a defensive fallback for object maps. */
export function normalizeFrankfurterRates(payload, expectedBase) {
  if (Array.isArray(payload)) {
    return payload
      .map(normalizeRateRow)
      .filter((row) => row.base && row.quote && Number.isFinite(row.rate));
  }

  if (
    payload &&
    typeof payload === 'object' &&
    payload.rates &&
    typeof payload.rates === 'object'
  ) {
    return Object.entries(payload.rates)
      .map(([quote, rate]) => ({
        date: payload.date ?? null,
        base: String(payload.base ?? expectedBase ?? '').toUpperCase(),
        quote: quote.toUpperCase(),
        rate: Number(rate),
      }))
      .filter((row) => row.base && row.quote && Number.isFinite(row.rate));
  }

  return [];
}

export function normalizeFrankfurterSingleRate(payload, base, quote) {
  const candidate = Array.isArray(payload) ? payload[0] : payload;
  const normalized = normalizeRateRow({
    ...candidate,
    base: candidate?.base ?? base,
    quote: candidate?.quote ?? quote,
  });
  if (!normalized.base || !normalized.quote || !Number.isFinite(normalized.rate)) {
    throw new TypeError('Frankfurter returned an invalid currency rate.');
  }
  return normalized;
}
