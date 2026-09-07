import { describe, expect, it } from 'vitest';

import { snapshotDatabasePool } from './pool-metrics.js';

describe('database pool metrics', () => {
  it('reports bounded pool use and saturation without connection details', () => {
    const pool = {
      totalCount: 5,
      idleCount: 2,
      waitingCount: 3,
      options: {
        max: 5,
        connectionString: 'postgresql://private-user:private-password@private-host/database',
      },
    };

    const snapshot = snapshotDatabasePool(pool);

    expect(snapshot).toEqual({
      maxConnections: 5,
      totalConnections: 5,
      idleConnections: 2,
      activeConnections: 3,
      waitingRequests: 3,
      utilization: 0.6,
      saturated: true,
    });
    expect(JSON.stringify(snapshot)).not.toContain('private-user');
    expect(JSON.stringify(snapshot)).not.toContain('private-password');
    expect(JSON.stringify(snapshot)).not.toContain('private-host');
  });

  it('clamps impossible or invalid counters instead of emitting misleading values', () => {
    expect(
      snapshotDatabasePool({
        totalCount: 2,
        idleCount: 8,
        waitingCount: -1,
        options: { max: 1 },
      }),
    ).toEqual({
      maxConnections: 1,
      totalConnections: 2,
      idleConnections: 2,
      activeConnections: 0,
      waitingRequests: 0,
      utilization: 0,
      saturated: false,
    });
  });

  it('fails fast when no pool object is supplied', () => {
    /** @type {any} */
    const invalidPool = null;
    expect(() => snapshotDatabasePool(invalidPool)).toThrow(
      'Database pool metrics require a pool object.',
    );
  });
});
