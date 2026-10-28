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
  for (const entry of evaluatedEvidence) {
    if (
      typeof entry?.destinationId === 'string' &&
      allowed.has(entry.destinationId) &&
      !evidenceByDestination.has(entry.destinationId)
    ) {
      evidenceByDestination.set(entry.destinationId, entry);
    }
  }

  const comparison = compareVerifiedHolidayRanges(
    candidateEnvelope.destinations.map(
      (candidate) => evidenceByDestination.get(candidate.id) ?? { destinationId: candidate.id },
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
