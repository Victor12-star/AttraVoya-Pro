import { NotFoundError, ValidationError } from '../../errors/app-error.js';
import {
  applyAccommodationPricingCollection,
  buildAffordabilityEvidenceGate,
} from './affordability-evidence.js';
import { buildBudgetEnvelope } from './budget-allocation.js';
import { normalizeAccommodationPricingEvidence } from './pricing-evidence.js';

function toDate(value) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function toDateString(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : null;
}

function toDecimalString(value) {
  return value === null || value === undefined ? null : String(value);
}

function mapStayPreference(stayPreference) {
  if (!stayPreference) return null;

  return {
    types: stayPreference.types,
    unitType: stayPreference.unitType,
    breakfast: stayPreference.breakfast,
    kitchen: stayPreference.kitchen,
    privateBathroom: stayPreference.privateBathroom,
    requiredAmenities: stayPreference.requiredAmenities,
    preferredAmenities: stayPreference.preferredAmenities,
    nearPriorities: stayPreference.nearPriorities,
    maxNightlyAmount: toDecimalString(stayPreference.maxNightlyAmount),
    maxTotalStayAmount: toDecimalString(stayPreference.maxTotalStayAmount),
    longStayFriendly: stayPreference.longStayFriendly,
    familyFriendly: stayPreference.familyFriendly,
  };
}

function mapPlannerRequest(record) {
  return {
    id: record.id,
    origin: {
      label: record.originLabel,
      cityId: record.originCityId,
      airportId: record.originAirportId,
    },
    targetDestination: record.targetDestination
      ? {
          id: record.targetDestination.id,
          slug: record.targetDestination.slug,
          name: record.targetDestination.city.name,
          countryCode: record.targetDestination.city.country.iso2,
        }
      : null,
    dates: {
      flexible: record.flexibleDates,
      fixedDeparture: toDateString(record.fixedDeparture),
      fixedReturn: toDateString(record.fixedReturn),
      earliestDeparture: toDateString(record.earliestDeparture),
      latestReturn: toDateString(record.latestReturn),
      minNights: record.minNights,
      maxNights: record.maxNights,
    },
    budget: {
      amount: toDecimalString(record.budgetAmount),
      currencyCode: record.budgetCurrency.code,
      safetyReservePercent: toDecimalString(record.safetyReservePercent),
    },
    travellers: {
      adults: record.adults,
      childrenAges: record.childrenAges,
    },
    interests: record.interests,
    comfortLevel: record.comfortLevel,
    accommodation: mapStayPreference(record.stayPreference),
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapDestinationCandidate(record) {
  return {
    id: record.id,
    slug: record.slug,
    name: record.city.name,
    regionName: record.city.regionName,
    country: {
      code: record.city.country.iso2,
      name: record.city.country.name,
    },
    summary: record.summary,
  };
}

function destinationCandidateEnvelope({ requestId, mode, records }) {
  return {
    requestId,
    mode,
    destinations: records.map(mapDestinationCandidate),
    evaluation: {
      budgetFit: 'NOT_EVALUATED',
      rankingApplied: false,
      priceDataAvailable: false,
      availabilityDataUsed: false,
    },
    provenance: {
      kind: 'PUBLISHED_CATALOG_CANDIDATE',
      source: 'ATTRAVOYA_PUBLISHED_DESTINATION_CATALOG',
      liveDataUsed: false,
      providerDataUsed: false,
      pricingDataUsed: false,
      statement:
        'Candidates are published AttraVoya catalog destinations only. They are not ranked by price or confirmed affordable, and no fare, accommodation-price, or availability data was used.',
    },
  };
}

async function collectAccommodationPricingEvidence(collector, gate) {
  if (!collector) return { status: 'NOT_CONFIGURED' };

  try {
    const rawEvidence = await collector.collect({
      requestId: gate.requestId,
      destination: gate.destination,
      searchContext: gate.searchContext,
    });
    if (!rawEvidence) return { status: 'UNAVAILABLE' };

    return {
      status: 'COLLECTED',
      evidence: normalizeAccommodationPricingEvidence(
        rawEvidence,
        gate.searchContext.budget.currencyCode,
      ),
    };
  } catch {
    return { status: 'FAILED' };
  }
}

export function createPlannerService(repository, options = {}) {
  if (!repository) throw new TypeError('Planner repository is required.');
  const accommodationPricingCollector = options.accommodationPricingCollector;

  return {
    async createRequest({ userId, input }) {
      const {
        budgetCurrencyCode,
        fixedDeparture,
        fixedReturn,
        earliestDeparture,
        latestReturn,
        ...rest
      } = input;
      const currency = await repository.findCurrencyByCode(budgetCurrencyCode);
      if (!currency) {
        throw new ValidationError('The selected budget currency is not supported.');
      }

      const [destination, originCity, originAirport] = await Promise.all([
        input.targetDestinationId
          ? repository.findDestinationById(input.targetDestinationId)
          : Promise.resolve(null),
        input.originCityId
          ? repository.findOriginCityById(input.originCityId)
          : Promise.resolve(null),
        input.originAirportId
          ? repository.findOriginAirportById(input.originAirportId)
          : Promise.resolve(null),
      ]);

      if (input.targetDestinationId && (!destination || destination.status !== 'PUBLISHED')) {
        throw new ValidationError('The selected destination is not available for planning.');
      }
      if (input.originCityId && !originCity) {
        throw new ValidationError('The selected origin city is not available.');
      }
      if (input.originAirportId && !originAirport) {
        throw new ValidationError('The selected origin airport is not available.');
      }
      if (
        input.originCityId &&
        originAirport?.cityId &&
        originAirport.cityId !== input.originCityId
      ) {
        throw new ValidationError('The selected origin city and airport do not match.');
      }

      const record = await repository.createOwnedRequest({
        userId,
        currencyId: currency.id,
        input: {
          ...rest,
          fixedDeparture: toDate(fixedDeparture),
          fixedReturn: toDate(fixedReturn),
          earliestDeparture: toDate(earliestDeparture),
          latestReturn: toDate(latestReturn),
          status: 'DRAFT',
        },
      });

      return mapPlannerRequest(record);
    },

    async listRequests(userId) {
      const records = await repository.listOwnedRequests(userId, 20);
      return records.map(mapPlannerRequest);
    },

    async getRequest({ userId, requestId }) {
      const record = await repository.findOwnedRequestById({ userId, requestId });
      if (!record) throw new NotFoundError('The planning request was not found.');
      return mapPlannerRequest(record);
    },

    async getAllocation({ userId, requestId }) {
      const record = await repository.findOwnedRequestById({ userId, requestId });
      if (!record) throw new NotFoundError('The planning request was not found.');
      return buildBudgetEnvelope(record);
    },

    async getDestinationCandidates({ userId, requestId }) {
      const record = await repository.findOwnedRequestById({ userId, requestId });
      if (!record) throw new NotFoundError('The planning request was not found.');

      if (record.targetDestinationId) {
        const target = await repository.findPublishedDestinationCandidateById(
          record.targetDestinationId,
        );
        return destinationCandidateEnvelope({
          requestId,
          mode: 'FIXED_TARGET',
          records: target ? [target] : [],
        });
      }

      const records = await repository.listPublishedDestinationCandidates({
        excludeCityId: record.originCityId ?? undefined,
        limit: 20,
      });
      return destinationCandidateEnvelope({
        requestId,
        mode: 'PUBLISHED_CATALOG',
        records,
      });
    },

    async getAffordabilityEvidence({ userId, requestId, destinationId }) {
      const record = await repository.findOwnedRequestById({ userId, requestId });
      if (!record) throw new NotFoundError('The planning request was not found.');

      let candidate = null;
      if (record.targetDestinationId) {
        if (record.targetDestinationId === destinationId) {
          candidate = await repository.findPublishedDestinationCandidateById(destinationId);
        }
      } else {
        const candidates = await repository.listPublishedDestinationCandidates({
          excludeCityId: record.originCityId ?? undefined,
          limit: 20,
        });
        candidate = candidates.find((item) => item.id === destinationId) ?? null;
      }

      if (!candidate) throw new NotFoundError('The destination candidate was not found.');

      const gate = buildAffordabilityEvidenceGate({
        planRequest: mapPlannerRequest(record),
        destination: mapDestinationCandidate(candidate),
        budgetEnvelope: buildBudgetEnvelope(record),
      });
      const accommodationCollection = await collectAccommodationPricingEvidence(
        accommodationPricingCollector,
        gate,
      );
      return applyAccommodationPricingCollection(gate, accommodationCollection);
    },
  };
}
