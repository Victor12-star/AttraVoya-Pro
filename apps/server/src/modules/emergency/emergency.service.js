function safeText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function safeSourceUrl(value) {
  const candidate = safeText(value, 1000);
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function verifiedIsoTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** @param {any} record @param {string} countryCode */
function toPublicRecord(record, countryCode) {
  if (
    record?.status !== 'VERIFIED' ||
    record?.isPublished !== true ||
    record?.regionName !== null ||
    record?.country?.iso2 !== countryCode
  ) {
    return null;
  }

  const id = safeText(record.id, 128);
  const service = safeText(record.service, 64);
  const serviceLabel = safeText(record.serviceLabel, 160);
  const phoneNumber = safeText(record.phoneNumber, 80);
  const sourceName = safeText(record.sourceName, 240);
  const sourceUrl = safeSourceUrl(record.sourceUrl);
  const lastVerifiedAt = verifiedIsoTimestamp(record.lastVerifiedAt);

  if (
    !id ||
    !service ||
    !serviceLabel ||
    !phoneNumber ||
    !sourceName ||
    !sourceUrl ||
    !lastVerifiedAt
  ) {
    return null;
  }

  return {
    id,
    service,
    serviceLabel,
    phoneNumber,
    sourceName,
    sourceUrl,
    lastVerifiedAt,
  };
}

export function createEmergencyService(repository) {
  return {
    /** @param {string} countryCode */
    async listVerifiedCountryEmergency(countryCode) {
      const rows = await repository.listPublishedVerifiedByCountryCode(countryCode);
      const records = Array.isArray(rows)
        ? rows.map((record) => toPublicRecord(record, countryCode)).filter(Boolean)
        : [];

      return {
        countryCode,
        records,
      };
    },
  };
}
