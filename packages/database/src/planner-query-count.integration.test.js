import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { describe, expect, it } from 'vitest';

import { createPlannerRepository } from '../../../apps/server/src/modules/planner/planner.repository.js';

const describePlannerQueryCount =
  process.env.DATABASE_POOL_EXHAUSTION_TEST === '1' ? describe : describe.skip;

const TEST_COUNTRY_ISO2 = 'XZ';
const TEST_COUNTRY_ISO3 = 'XZZ';
const TEST_CURRENCY_CODE = 'XQC';
const MAX_EXPECTED_PLANNER_READ_QUERIES = 8;

/**
 * Count only SQL reads that can grow with planner relation loading. Connection,
 * transaction and fixture-management statements are intentionally excluded so
 * the regression contract measures the production repository query shape.
 *
 * @param {string[]} queries
 */
function countPlannerReadQueries(queries) {
  return queries.filter((query) =>
    /"(TravelPlanRequest|TravelStayPreference|Currency|Destination|City|Country)"/.test(query),
  ).length;
}

describePlannerQueryCount('planner list PostgreSQL query-count contract', () => {
  it('keeps nested relation SQL bounded as the planner page grows and paginates', async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for the planner query-count integration test.');
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
    const countryId = `query-count-country-${suffix}`;
    const cityId = `query-count-city-${suffix}`;
    const destinationId = `query-count-destination-${suffix}`;
    const currencyId = `query-count-currency-${suffix}`;
    const userId = `query-count-user-${suffix}`;
    const requestIds = Array.from(
      { length: 41 },
      (_, index) => `query-count-request-${suffix}-${index}`,
    );
    const baseCreatedAt = Date.now();

    try {
      await prisma.$connect();
      await prisma.country.create({
        data: {
          id: countryId,
          iso2: TEST_COUNTRY_ISO2,
          iso3: TEST_COUNTRY_ISO3,
          name: `Query Count Country ${suffix}`,
        },
      });
      await prisma.city.create({
        data: {
          id: cityId,
          countryId,
          name: `Query Count City ${suffix}`,
          normalizedName: `query count city ${suffix}`,
          slug: `query-count-city-${suffix}`,
          latitude: '59.329300',
          longitude: '18.068600',
        },
      });
      await prisma.destination.create({
        data: {
          id: destinationId,
          cityId,
          slug: `query-count-destination-${suffix}`,
          status: 'PUBLISHED',
        },
      });
      await prisma.currency.create({
        data: {
          id: currencyId,
          code: TEST_CURRENCY_CODE,
          name: `Query Count Currency ${suffix}`,
        },
      });
      await prisma.user.create({
        data: {
          id: userId,
          email: `planner-query-count-${suffix}@example.invalid`,
          passwordHash: 'integration-test-only',
          status: 'ACTIVE',
        },
      });

      await prisma.travelPlanRequest.createMany({
        data: requestIds.map((id, index) => ({
          id,
          userId,
          originLabel: 'Query Count Origin',
          targetDestinationId: destinationId,
          budgetAmount: '1500.00',
          budgetCurrencyId: currencyId,
          adults: 2,
          childrenAges: [7],
          interests: ['culture'],
          createdAt: new Date(baseCreatedAt - index * 1_000),
        })),
      });
      await prisma.travelStayPreference.createMany({
        data: requestIds.map((requestId, index) => ({
          id: `query-count-stay-${suffix}-${index}`,
          requestId,
          types: ['HOTEL'],
          requiredAmenities: [],
          preferredAmenities: ['wifi'],
          nearPriorities: ['city-centre'],
          familyFriendly: true,
        })),
      });

      const repository = createPlannerRepository(prisma);

      // Warm the client before measuring so connection/session initialization is
      // excluded from the SQL count and only repository reads are compared.
      await repository.listOwnedRequests(userId, 1);

      async function measure(limit, cursor) {
        observedQueries.length = 0;
        const rows = await repository.listOwnedRequests(userId, limit, cursor);
        return {
          rows,
          queryCount: countPlannerReadQueries(observedQueries),
        };
      }

      const tinyPage = await measure(1);
      const fullPage = await measure(20);
      const cursorRow = fullPage.rows.at(19);
      if (!cursorRow) {
        throw new Error('Expected a twentieth planner row for cursor measurement.');
      }
      const continuationPage = await measure(20, {
        createdAt: cursorRow.createdAt,
        id: cursorRow.id,
      });

      expect(tinyPage.rows).toHaveLength(2);
      expect(fullPage.rows).toHaveLength(21);
      expect(continuationPage.rows).toHaveLength(21);

      for (const row of fullPage.rows) {
        expect(row.budgetCurrency.code).toBe(TEST_CURRENCY_CODE);
        expect(row.targetDestination?.city.country.iso2).toBe(TEST_COUNTRY_ISO2);
        expect(row.stayPreference?.types).toContain('HOTEL');
      }

      expect(tinyPage.queryCount).toBeGreaterThan(0);
      expect(fullPage.queryCount).toBe(tinyPage.queryCount);
      expect(continuationPage.queryCount).toBe(tinyPage.queryCount);
      expect(fullPage.queryCount).toBeLessThanOrEqual(MAX_EXPECTED_PLANNER_READ_QUERIES);
    } finally {
      // Cleanup is part of the regression contract. Silently swallowing a failed
      // delete can leak fixtures into later database checks and hide the real
      // source of nondeterministic CI failures.
      try {
        await prisma.$transaction([
          prisma.travelPlanRequest.deleteMany({ where: { id: { in: requestIds } } }),
          prisma.user.deleteMany({ where: { id: userId } }),
          prisma.destination.deleteMany({ where: { id: destinationId } }),
          prisma.city.deleteMany({ where: { id: cityId } }),
          prisma.country.deleteMany({ where: { id: countryId } }),
          prisma.currency.deleteMany({ where: { id: currencyId } }),
        ]);
      } finally {
        // Database handles must always be released, even when fixture cleanup
        // fails, otherwise the CI process can hang and obscure the useful error.
        try {
          await prisma.$disconnect();
        } finally {
          await pool.end();
        }
      }
    }
  });
});
