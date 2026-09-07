import pg from 'pg';
import { describe, expect, it } from 'vitest';

import { snapshotDatabasePool } from './pool-metrics.js';

const describePoolExhaustion =
  process.env.DATABASE_POOL_EXHAUSTION_TEST === '1' ? describe : describe.skip;

/**
 * Wait briefly for pg.Pool's public counters to reflect an asynchronous state
 * transition without depending on internal implementation details.
 *
 * @param {() => boolean} predicate
 * @param {number} [timeoutMs]
 */
async function waitForCondition(predicate, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error('Timed out waiting for PostgreSQL pool state.');
}

describePoolExhaustion('database pool exhaustion behavior', () => {
  it('queues excess acquisition, reports saturation, and recovers without exceeding max', async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for the pool exhaustion integration test.');
    }

    const pool = new pg.Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 2_000,
    });

    const firstClient = await pool.connect();
    const secondClient = await pool.connect();
    let firstReleased = false;
    let secondReleased = false;
    let thirdClient = null;
    let thirdReleased = false;
    const thirdClientPromise = pool.connect();

    try {
      await waitForCondition(() => pool.waitingCount === 1);

      expect(snapshotDatabasePool(pool)).toEqual({
        maxConnections: 2,
        totalConnections: 2,
        idleConnections: 0,
        activeConnections: 2,
        waitingRequests: 1,
        utilization: 1,
        saturated: true,
      });

      firstClient.release();
      firstReleased = true;
      thirdClient = await thirdClientPromise;

      await waitForCondition(() => pool.waitingCount === 0);
      expect(pool.totalCount).toBe(2);

      secondClient.release();
      secondReleased = true;
      thirdClient.release();
      thirdReleased = true;

      await waitForCondition(() => pool.idleCount === 2);
      expect(snapshotDatabasePool(pool)).toEqual({
        maxConnections: 2,
        totalConnections: 2,
        idleConnections: 2,
        activeConnections: 0,
        waitingRequests: 0,
        utilization: 0,
        saturated: false,
      });
    } finally {
      if (!firstReleased) {
        firstClient.release();
      }
      if (!secondReleased) {
        secondClient.release();
      }
      if (!thirdClient) {
        thirdClient = await thirdClientPromise.catch(() => null);
      }
      if (thirdClient && !thirdReleased) {
        thirdClient.release();
      }
      await pool.end();
    }
  });
});
