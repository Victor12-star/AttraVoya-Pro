import { createHash } from 'node:crypto';

function toDateString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function toDecimalString(value) {
  if (value === null || value === undefined) return null;
  return Number(value).toFixed(2);
}

function inputStayPreference(accommodation) {
  if (!accommodation) return null;

  return {
    types: accommodation.types,
    unitType: accommodation.unitType,
    breakfast: accommodation.breakfast,
    kitchen: accommodation.kitchen,
    privateBathroom: accommodation.privateBathroom,
    requiredAmenities: accommodation.requiredAmenities,
    preferredAmenities: accommodation.preferredAmenities,
    nearPriorities: accommodation.nearPriorities,
    maxNightlyAmount: toDecimalString(accommodation.maxNightlyAmount),
    maxTotalStayAmount: toDecimalString(accommodation.maxTotalStayAmount),
    longStayFriendly: accommodation.longStayFriendly,
    familyFriendly: accommodation.familyFriendly,
  };
}

function storedStayPreference(stayPreference) {
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

function comparableInput(input) {
  return {
    originLabel: input.originLabel,
    originCityId: input.originCityId ?? null,
    originAirportId: input.originAirportId ?? null,
    targetDestinationId: input.targetDestinationId ?? null,
    earliestDeparture: input.earliestDeparture ?? null,
    latestReturn: input.latestReturn ?? null,
    fixedDeparture: input.fixedDeparture ?? null,
    fixedReturn: input.fixedReturn ?? null,
    minNights: input.minNights,
    maxNights: input.maxNights,
    flexibleDates: input.flexibleDates,
    budgetAmount: toDecimalString(input.budgetAmount),
    budgetCurrencyCode: input.budgetCurrencyCode,
    adults: input.adults,
    childrenAges: input.childrenAges,
    interests: input.interests,
    comfortLevel: input.comfortLevel,
    safetyReservePercent: toDecimalString(input.safetyReservePercent),
    accommodation: inputStayPreference(input.accommodation),
  };
}

function comparableStoredRequest(record) {
  return {
    originLabel: record.originLabel,
    originCityId: record.originCityId ?? null,
    originAirportId: record.originAirportId ?? null,
    targetDestinationId: record.targetDestinationId ?? null,
    earliestDeparture: toDateString(record.earliestDeparture),
    latestReturn: toDateString(record.latestReturn),
    fixedDeparture: toDateString(record.fixedDeparture),
    fixedReturn: toDateString(record.fixedReturn),
    minNights: record.minNights,
    maxNights: record.maxNights,
    flexibleDates: record.flexibleDates,
    budgetAmount: toDecimalString(record.budgetAmount),
    budgetCurrencyCode: record.budgetCurrency.code,
    adults: record.adults,
    childrenAges: record.childrenAges,
    interests: record.interests,
    comfortLevel: record.comfortLevel,
    safetyReservePercent: toDecimalString(record.safetyReservePercent),
    accommodation: storedStayPreference(record.stayPreference),
  };
}

export function plannerRequestIdFromIdempotencyKey({ userId, idempotencyKey }) {
  const digest = createHash('sha256')
    .update('attravoya:planner:create\0')
    .update(userId)
    .update('\0')
    .update(idempotencyKey)
    .digest('hex');

  return `pridem_${digest}`;
}

export function plannerRequestMatchesInput(record, input) {
  return JSON.stringify(comparableStoredRequest(record)) === JSON.stringify(comparableInput(input));
}
