function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

/**
 * Return bounded process-local PostgreSQL pool gauges without exposing SQL,
 * connection strings, database names, users, hosts, or request data.
 *
 * @param {{
 *   totalCount?: number,
 *   idleCount?: number,
 *   waitingCount?: number,
 *   options?: { max?: number }
 * }} pool
 */
export function snapshotDatabasePool(pool) {
  if (!pool || typeof pool !== 'object') {
    throw new TypeError('Database pool metrics require a pool object.');
  }

  const maxConnections = positiveInteger(pool.options?.max);
  const totalConnections = nonNegativeInteger(pool.totalCount);
  const idleConnections = Math.min(nonNegativeInteger(pool.idleCount), totalConnections);
  const activeConnections = Math.max(0, totalConnections - idleConnections);
  const waitingRequests = nonNegativeInteger(pool.waitingCount);
  const utilization = maxConnections > 0 ? Math.min(1, activeConnections / maxConnections) : 0;

  return Object.freeze({
    maxConnections,
    totalConnections,
    idleConnections,
    activeConnections,
    waitingRequests,
    utilization,
    saturated: waitingRequests > 0 || (maxConnections > 0 && activeConnections >= maxConnections),
  });
}
