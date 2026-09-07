// Singleton PrismaClient and PostgreSQL pool for the AttraVoya Pro backend.
// A single resource bundle is shared across the Node process to avoid exhausting
// PostgreSQL connection limits during hot reload / serverless warm-ups.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { createDatabaseCloser } from './lifecycle.js';
import { databasePoolConfig } from './pool-config.js';
import { snapshotDatabasePool } from './pool-metrics.js';

function createDatabaseResources() {
  const databasePool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ...databasePoolConfig,
  });
  const adapter = new PrismaPg(databasePool);
  const prisma = new PrismaClient({ adapter });

  return { databasePool, prisma };
}

// Store both resources together so hot reload never reuses a Prisma client with
// a different pool or creates an untracked pool beside the shared singleton.
const globalForDatabase = /** @type {{
 * databaseResources?: ReturnType<typeof createDatabaseResources>
 * }} */ (globalThis);

const databaseResources = globalForDatabase.databaseResources ?? createDatabaseResources();

export const prisma = databaseResources.prisma;
const databasePool = databaseResources.databasePool;

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.databaseResources = databaseResources;
}

export const closeDatabase = createDatabaseCloser({
  prismaClient: prisma,
  pool: databasePool,
});

/**
 * Read instantaneous process-local PostgreSQL pool gauges. The returned object
 * contains only bounded counts/ratios and never connection or query details.
 */
export function getDatabasePoolMetrics() {
  return snapshotDatabasePool(databasePool);
}

export default prisma;
