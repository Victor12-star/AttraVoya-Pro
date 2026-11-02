import { compareVerifiedHolidayRanges } from './verified-holiday-comparison.js';

/**
 * Restrict verified evidence comparison to destinations returned by the
 * authenticated owned-brief country/city candidate discovery endpoint.
 * No evidence is created here and destinations without evidence stay unranked.
 */
export function compareScopedHolidayCandidates(candidateEnvelope, evaluatedEvidence = []) {
  if (!candidateEnvelope || !Array.isArray(candidateEnvelope.destinations)) {
    throw new TypeError('A scoped candidate envelope is required.');
  }
  if (!Array.isArray(evaluatedEvidence)) {
    throw new TypeError('Evaluated evidence must be an array.');
  }

  const allowed = new Set(candidateEnvelope.destinations.map((candidate) => candidate.id));
  const evidenceByDestination = new Map();
  const conflictingDestinations = new Set();
  for (const entry of evaluatedEvidence) {
    const destinationId = entry?.destinationId;
    if (typeof destinationId !== 'string' || !allowed.has(destinationId)) continue;
    if (evidenceByDestination.has(destinationId)) {
      conflictingDestinations.add(destinationId);
    } else {
      evidenceByDestination.set(destinationId, entry);
    }
  }

  // Conflicting records cannot prove a reliable price range, regardless of order.
  const comparison = compareVerifiedHolidayRanges(
    candidateEnvelope.destinations.map((candidate) =>
      conflictingDestinations.has(candidate.id)
        ? { destinationId: candidate.id }
        : (evidenceByDestination.get(candidate.id) ?? { destinationId: candidate.id }),
    ),
  );
  const rankedIds = new Set(comparison.ranked.map((item) => item.destinationId));
  return {
    requestId: candidateEnvelope.requestId,
    scope: candidateEnvelope.scope,
    countryCode: candidateEnvelope.countryCode,
    cityId: candidateEnvelope.cityId ?? null,
    ...comparison,
    ranked: comparison.ranked.map((item) => ({
      ...item,
      destination: candidateEnvelope.destinations.find(
        (candidate) => candidate.id === item.destinationId,
      ),
    })),
    unranked: comparison.unranked.filter((item) => !rankedIds.has(item.destinationId)),
    availabilityDataUsed: false,
  };
}
