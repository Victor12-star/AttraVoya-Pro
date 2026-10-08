const DEFAULT_MAX_CODES = 32;
const OVERFLOW_CODE = '<overflow>';

function statusClassFor(statusCode) {
  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) return 'other';
  return `${Math.floor(statusCode / 100)}xx`;
}

function incrementStatusClass(statusClasses, statusClass) {
  if (Object.hasOwn(statusClasses, statusClass)) {
    statusClasses[statusClass] += 1;
    return;
  }

  statusClasses.other += 1;
}

export function createApplicationErrorMetrics({ maxCodes = DEFAULT_MAX_CODES } = {}) {
  if (!Number.isInteger(maxCodes) || maxCodes < 1) {
    throw new RangeError('maxCodes must be a positive integer.');
  }

  const statusClasses = {
    '4xx': 0,
    '5xx': 0,
    other: 0,
  };
  const codes = new Map();
  let errors = 0;
  let serverErrors = 0;

  function codeKey(code) {
    const normalized = typeof code === 'string' && code.length > 0 ? code : 'UNKNOWN_ERROR';
    if (codes.has(normalized)) return normalized;
    if (codes.size < maxCodes) return normalized;
    return OVERFLOW_CODE;
  }

  return {
    record({ code, statusCode }) {
      const safeStatusCode = Number.isInteger(statusCode) ? statusCode : 0;
      const key = codeKey(code);

      errors += 1;
      if (safeStatusCode >= 500 && safeStatusCode <= 599) serverErrors += 1;
      incrementStatusClass(statusClasses, statusClassFor(safeStatusCode));
      codes.set(key, (codes.get(key) ?? 0) + 1);
    },

    snapshot() {
      return {
        errors,
        serverErrors,
        serverErrorRate: errors > 0 ? serverErrors / errors : 0,
        statusClasses: { ...statusClasses },
        codes: Array.from(codes, ([code, count]) => ({ code, count })),
      };
    },
  };
}
