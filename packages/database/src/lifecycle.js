/**
 * Build a single-flight database close function for an externally owned pg.Pool.
 * Prisma disconnects first so its adapter stops using the pool, then the pool is
 * ended explicitly so Node releases every PostgreSQL connection on shutdown.
 *
 * @param {{
 *   prismaClient: { $disconnect: () => Promise<void> },
 *   pool: { end: () => Promise<void> }
 * }} dependencies
 */
export function createDatabaseCloser({ prismaClient, pool }) {
  if (!prismaClient || typeof prismaClient.$disconnect !== 'function') {
    throw new TypeError('Database closer requires a Prisma disconnect function.');
  }
  if (!pool || typeof pool.end !== 'function') {
    throw new TypeError('Database closer requires a pool end function.');
  }

  /** @type {Promise<void> | undefined} */
  let closePromise;

  return function closeDatabase() {
    if (closePromise) return closePromise;

    closePromise = (async () => {
      /** @type {unknown} */
      let disconnectError;

      try {
        await prismaClient.$disconnect();
      } catch (error) {
        disconnectError = error;
      }

      try {
        await pool.end();
      } catch (poolError) {
        if (disconnectError === undefined) throw poolError;
      }

      if (disconnectError !== undefined) throw disconnectError;
    })();

    return closePromise;
  };
}
