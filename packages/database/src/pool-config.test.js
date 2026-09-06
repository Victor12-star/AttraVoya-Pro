import { describe, expect, it } from 'vitest';

import { loadDatabasePoolConfig } from './pool-config.js';

describe('database pool configuration', () => {
  it('uses a conservative bounded per-process default', () => {
    expect(loadDatabasePoolConfig({})).toEqual({
      max: 5,
      connectionTimeoutMillis: 5_000,
    });
  });

  it('accepts explicit bounded production values', () => {
    expect(
      loadDatabasePoolConfig({
        DB_POOL_MAX: '8',
        DB_POOL_CONNECTION_TIMEOUT_MS: '3000',
      }),
    ).toEqual({
      max: 8,
      connectionTimeoutMillis: 3_000,
    });
  });

  it.each([
    ['DB_POOL_MAX', '0'],
    ['DB_POOL_MAX', '51'],
    ['DB_POOL_MAX', 'not-a-number'],
    ['DB_POOL_CONNECTION_TIMEOUT_MS', '499'],
    ['DB_POOL_CONNECTION_TIMEOUT_MS', '30001'],
  ])('fails closed for invalid %s=%s', (name, value) => {
    expect(() => loadDatabasePoolConfig({ [name]: value })).toThrow(
      'Invalid AttraVoya Pro database pool configuration',
    );
  });
});
