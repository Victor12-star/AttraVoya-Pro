import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { describe, expect, it } from 'vitest';

import { createCountriesRepository } from '../../../apps/server/src/modules/countries/countries.repository.js';

const describeCountryReferenceQueryCount =
  process.env.DATABASE_POOL_EXHAUSTION_TEST === '1' ? describe : describe.skip;

const FIXTURE_COUNT = 20;
const MAX_EXPECTED_COUNTRY_REFERENCE_READ_QUERIES = 5;

/**
 * Count only reads belonging to the country/language/currency relation graph.
 * Connection and fixture-management statements are excluded so the contract
 * detects relation reads that grow with the returned country count.
 *
 * @param {string[]} queries
 */
function countCountryReferenceReadQueries(queries) {
  return queries.filter((query) =>
    /"(Country|CountryLanguage|Language|CountryCurrency|Currency)"/.test(query),
  ).length;
}

describeCountryReferenceQueryCount('country reference PostgreSQL query-count contract', () => {
  it('keeps nested language and currency SQL constant as the catalogue grows', async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for the country reference query-count test.');
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
    const countryIds = Array.from(
      { length: FIXTURE_COUNT },
      (_, index) => `country-query-count-${suffix}-${index}`,
    );

    try {
      await prisma.$connect();

      const [language, currency] = await Promise.all([
        prisma.language.findFirst({ orderBy: { code: 'asc' }, select: { id: true } }),
        prisma.currency.findFirst({ orderBy: { code: 'asc' }, select: { id: true } }),
      ]);
      if (!language || !currency) {
        throw new Error('Seeded language and currency reference data are required.');
      }

      await prisma.country.createMany({
        data: countryIds.map((id, index) => ({
          id,
          iso2: String(index).padStart(2, '0'),
          iso3: `Q${String(index).padStart(2, '0')}`,
          name: `000 Query Count Country ${String(index).padStart(2, '0')} ${suffix}`,
        })),
      });
      await prisma.countryLanguage.createMany({
        data: countryIds.map((countryId) => ({
          countryId,
          languageId: language.id,
          isOfficial: true,
          isCommon: true,
          rank: 1,
        })),
      });
      await prisma.countryCurrency.createMany({
        data: countryIds.map((countryId) => ({
          countryId,
          currencyId: currency.id,
          isPrimary: true,
        })),
      });

      const repository = createCountriesRepository(prisma);

      // Warm the connection before measurement so initialization SQL is not
      // mistaken for relation work performed by the repository.
      await repository.list({ limit: 1 });

      async function measure(limit) {
        observedQueries.length = 0;
        const rows = await repository.list({ limit });
        return {
          rows,
          queryCount: countCountryReferenceReadQueries(observedQueries),
        };
      }

      const singleCountry = await measure(1);
      const fullFixtureSet = await measure(FIXTURE_COUNT);

      expect(singleCountry.rows).toHaveLength(1);
      expect(fullFixtureSet.rows).toHaveLength(FIXTURE_COUNT);
      for (const row of fullFixtureSet.rows) {
        expect(row.languages).toHaveLength(1);
        expect(row.languages[0].language.id).toBeUndefined();
        expect(row.languages[0].language.code).toBeTypeOf('string');
        expect(row.currencies).toHaveLength(1);
        expect(row.currencies[0].currency.id).toBeUndefined();
        expect(row.currencies[0].currency.code).toBeTypeOf('string');
      }

      expect(singleCountry.queryCount).toBeGreaterThan(0);
      expect(fullFixtureSet.queryCount).toBe(singleCountry.queryCount);
      expect(fullFixtureSet.queryCount).toBeLessThanOrEqual(
        MAX_EXPECTED_COUNTRY_REFERENCE_READ_QUERIES,
      );
    } finally {
      try {
        await prisma.$transaction([
          prisma.countryLanguage.deleteMany({ where: { countryId: { in: countryIds } } }),
          prisma.countryCurrency.deleteMany({ where: { countryId: { in: countryIds } } }),
          prisma.country.deleteMany({ where: { id: { in: countryIds } } }),
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
