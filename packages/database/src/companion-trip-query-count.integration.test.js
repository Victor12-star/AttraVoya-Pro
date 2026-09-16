import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { describe, expect, it } from 'vitest';

import { createTripsRepository } from '../../../apps/server/src/modules/trips/trips.repository.js';

const describeCompanionTripQueryCount =
  process.env.DATABASE_POOL_EXHAUSTION_TEST === '1' ? describe : describe.skip;

const TEST_COUNTRY_ISO2 = 'YZ';
const TEST_COUNTRY_ISO3 = 'YZZ';
const MAX_EXPECTED_COMPANION_READ_QUERIES = 4;

/**
 * Count only reads that belong to the companion-trip relation graph. Connection,
 * transaction, and fixture-management statements are excluded so this contract
 * measures whether relation loading grows with the number of returned trips.
 *
 * @param {string[]} queries
 */
function countCompanionReadQueries(queries) {
  return queries.filter((query) => /"(Trip|Destination|City|Country)"/.test(query)).length;
}

describeCompanionTripQueryCount('Travel Companion PostgreSQL query-count contract', () => {
  it('keeps destination relation SQL bounded from one trip through the full companion limit', async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for the companion trip query-count test.');
    }

    const pool = new pg.Pool({
      connectionString,
      max: 3,
      connectionTimeoutMillis: 2_000,
    });
    const prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
      log: [{ emit: 'event', level: 'query' }],
    });
    const observedQueries = [];
    prisma.$on('query', (event) => observedQueries.push(event.query));

    const suffix = `${Date.now()}-${process.pid}`;
    const countryId = `companion-query-country-${suffix}`;
    const cityId = `companion-query-city-${suffix}`;
    const destinationId = `companion-query-destination-${suffix}`;
    const userId = `companion-query-user-${suffix}`;
    const tripIds = Array.from(
      { length: 10 },
      (_, index) => `companion-query-trip-${suffix}-${index}`,
    );
    const today = new Date('2026-09-16T00:00:00.000Z');

    try {
      await prisma.$connect();
      await prisma.country.create({
        data: {
          id: countryId,
          iso2: TEST_COUNTRY_ISO2,
          iso3: TEST_COUNTRY_ISO3,
          name: `Companion Query Country ${suffix}`,
        },
      });
      await prisma.city.create({
        data: {
          id: cityId,
          countryId,
          name: `Companion Query City ${suffix}`,
          normalizedName: `companion query city ${suffix}`,
          slug: `companion-query-city-${suffix}`,
          latitude: '59.329300',
          longitude: '18.068600',
        },
      });
      await prisma.destination.create({
        data: {
          id: destinationId,
          cityId,
          slug: `companion-query-destination-${suffix}`,
          status: 'PUBLISHED',
        },
      });
      await prisma.user.create({
        data: {
          id: userId,
          email: `companion-query-${suffix}@example.invalid`,
          passwordHash: 'integration-test-only',
          status: 'ACTIVE',
        },
      });
      await prisma.trip.createMany({
        data: tripIds.map((id, index) => ({
          id,
          userId,
          destinationId,
          title: `Companion trip ${index + 1}`,
          status: index === 0 ? 'ACTIVE' : 'PLANNED',
          startDate: new Date(Date.UTC(2026, 8, 16 + index)),
          endDate: new Date(Date.UTC(2026, 8, 18 + index)),
        })),
      });

      const repository = createTripsRepository(prisma);

      // Warm the connection before measurement so initialization SQL is not
      // mistaken for relation work performed by the repository.
      await repository.listOwnedCompanionTrips({ userId, today, limit: 1 });

      async function measure(limit) {
        observedQueries.length = 0;
        const rows = await repository.listOwnedCompanionTrips({ userId, today, limit });
        return {
          rows,
          queryCount: countCompanionReadQueries(observedQueries),
        };
      }

      const singleTrip = await measure(1);
      const fullCompanionSet = await measure(10);

      expect(singleTrip.rows).toHaveLength(1);
      expect(fullCompanionSet.rows).toHaveLength(10);
      for (const row of fullCompanionSet.rows) {
        expect(row.destination.city.country.iso2).toBe(TEST_COUNTRY_ISO2);
      }

      expect(singleTrip.queryCount).toBeGreaterThan(0);
      expect(fullCompanionSet.queryCount).toBe(singleTrip.queryCount);
      expect(fullCompanionSet.queryCount).toBeLessThanOrEqual(
        MAX_EXPECTED_COMPANION_READ_QUERIES,
      );
    } finally {
      try {
        await prisma.$transaction([
          prisma.trip.deleteMany({ where: { id: { in: tripIds } } }),
          prisma.user.deleteMany({ where: { id: userId } }),
          prisma.destination.deleteMany({ where: { id: destinationId } }),
          prisma.city.deleteMany({ where: { id: cityId } }),
          prisma.country.deleteMany({ where: { id: countryId } }),
        ]);
      } finally {
        try {
          await prisma.$disconnect();
        } finally {
          await pool.end();
        }
      }
    }
  });
});
