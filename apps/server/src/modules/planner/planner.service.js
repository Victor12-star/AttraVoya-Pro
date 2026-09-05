import { NotFoundError, ValidationError } from '../../errors/app-error.js';

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

export function createPlannerService(repository) {
  if (!repository) throw new TypeError('Planner repository is required.');

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
        input.originCityId ? repository.findOriginCityById(input.originCityId) : Promise.resolve(null),
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
  };
}
