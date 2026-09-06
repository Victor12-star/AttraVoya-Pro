const DEFAULT_POOL_MAX = 5;
const DEFAULT_CONNECTION_TIMEOUT_MS = 5_000;

function readBoundedInteger(source, name, { defaultValue, min, max }) {
  const rawValue = source[name];
  if (rawValue === undefined || String(rawValue).trim() === '') return defaultValue;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      `Invalid AttraVoya Pro database pool configuration: ${name} must be an integer between ${min} and ${max}.`,
    );
  }

  return value;
}

/**
 * Keep each Node process on a bounded PostgreSQL connection budget. The total
 * production database budget is therefore predictable as replicas scale:
 * per-process pool max × application/worker replica count.
 */
export function loadDatabasePoolConfig(source = process.env) {
  return Object.freeze({
    max: readBoundedInteger(source, 'DB_POOL_MAX', {
      defaultValue: DEFAULT_POOL_MAX,
      min: 1,
      max: 50,
    }),
    connectionTimeoutMillis: readBoundedInteger(source, 'DB_POOL_CONNECTION_TIMEOUT_MS', {
      defaultValue: DEFAULT_CONNECTION_TIMEOUT_MS,
      min: 500,
      max: 30_000,
    }),
  });
}

export const databasePoolConfig = loadDatabasePoolConfig();
