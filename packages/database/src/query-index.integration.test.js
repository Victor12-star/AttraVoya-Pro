import { afterAll, describe, expect, it } from 'vitest';

import { closeDatabase, prisma } from './index.js';

const describeQueryIndexes =
  process.env.DATABASE_POOL_EXHAUSTION_TEST === '1' ? describe : describe.skip;

/** @param {Array<Record<string, unknown>>} rows */
function renderExplainPlan(rows) {
  return rows.map((row) => String(row['QUERY PLAN'] ?? '')).join('\n');
}

function expectIndexBackedPlan(plan) {
  expect(plan).not.toContain('Seq Scan');
  expect(plan).toMatch(/Index|Bitmap/);
}

afterAll(async () => {
  if (process.env.DATABASE_POOL_EXHAUSTION_TEST === '1') {
    await closeDatabase();
  }
});

describeQueryIndexes('authentication query/index contract', () => {
  it('materializes composite indexes for the real invalidation and revocation filters', async () => {
    const rows = /** @type {Array<{tablename: string, indexname: string, indexdef: string}>} */ (
      await prisma.$queryRaw`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname IN (
            'AuthSession_userId_revokedAt_idx',
            'EmailVerificationToken_userId_usedAt_idx',
            'PasswordResetToken_userId_usedAt_idx'
          )
        ORDER BY indexname
      `
    );

    expect(rows).toHaveLength(3);

    const definitions = new Map(rows.map((row) => [row.indexname, row]));
    expect(definitions.get('AuthSession_userId_revokedAt_idx')).toMatchObject({
      tablename: 'AuthSession',
    });
    expect(definitions.get('AuthSession_userId_revokedAt_idx')?.indexdef).toContain(
      '"userId", "revokedAt"',
    );

    expect(definitions.get('EmailVerificationToken_userId_usedAt_idx')).toMatchObject({
      tablename: 'EmailVerificationToken',
    });
    expect(definitions.get('EmailVerificationToken_userId_usedAt_idx')?.indexdef).toContain(
      '"userId", "usedAt"',
    );

    expect(definitions.get('PasswordResetToken_userId_usedAt_idx')).toMatchObject({
      tablename: 'PasswordResetToken',
    });
    expect(definitions.get('PasswordResetToken_userId_usedAt_idx')?.indexdef).toContain(
      '"userId", "usedAt"',
    );
  });

  it('keeps the matching auth maintenance predicates indexable in PostgreSQL', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL enable_seqscan = off`;

      const sessionRows = /** @type {Array<Record<string, unknown>>} */ (
        await tx.$queryRaw`
          EXPLAIN (COSTS OFF)
          SELECT "id"
          FROM "AuthSession"
          WHERE "userId" = ${'query-index-probe'}
            AND "revokedAt" IS NULL
        `
      );
      const emailRows = /** @type {Array<Record<string, unknown>>} */ (
        await tx.$queryRaw`
          EXPLAIN (COSTS OFF)
          SELECT "id"
          FROM "EmailVerificationToken"
          WHERE "userId" = ${'query-index-probe'}
            AND "usedAt" IS NULL
        `
      );
      const resetRows = /** @type {Array<Record<string, unknown>>} */ (
        await tx.$queryRaw`
          EXPLAIN (COSTS OFF)
          SELECT "id"
          FROM "PasswordResetToken"
          WHERE "userId" = ${'query-index-probe'}
            AND "usedAt" IS NULL
        `
      );

      expectIndexBackedPlan(renderExplainPlan(sessionRows));
      expectIndexBackedPlan(renderExplainPlan(emailRows));
      expectIndexBackedPlan(renderExplainPlan(resetRows));
    });
  });
});

describeQueryIndexes('planner list query/index contract', () => {
  it('materializes the composite index used to list a traveller’s planner requests', async () => {
    const rows = /** @type {Array<{tablename: string, indexname: string, indexdef: string}>} */ (
      await prisma.$queryRaw`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'TravelPlanRequest_userId_createdAt_idx'
      `
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tablename: 'TravelPlanRequest',
      indexname: 'TravelPlanRequest_userId_createdAt_idx',
    });
    expect(rows[0]?.indexdef).toContain('"userId", "createdAt"');
  });

  it('keeps first-page and cursor-page planner list predicates index-backed in PostgreSQL', async () => {
    const cursorCreatedAt = new Date('2026-09-12T12:00:00.000Z');

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL enable_seqscan = off`;

      const firstPageRows = /** @type {Array<Record<string, unknown>>} */ (
        await tx.$queryRaw`
          EXPLAIN (COSTS OFF)
          SELECT "id", "createdAt"
          FROM "TravelPlanRequest"
          WHERE "userId" = ${'query-index-probe'}
          ORDER BY "createdAt" DESC, "id" DESC
          LIMIT 21
        `
      );
      const cursorPageRows = /** @type {Array<Record<string, unknown>>} */ (
        await tx.$queryRaw`
          EXPLAIN (COSTS OFF)
          SELECT "id", "createdAt"
          FROM "TravelPlanRequest"
          WHERE "userId" = ${'query-index-probe'}
            AND (
              "createdAt" < ${cursorCreatedAt}
              OR (
                "createdAt" = ${cursorCreatedAt}
                AND "id" < ${'query-index-probe-id'}
              )
            )
          ORDER BY "createdAt" DESC, "id" DESC
          LIMIT 21
        `
      );

      const firstPagePlan = renderExplainPlan(firstPageRows);
      const cursorPagePlan = renderExplainPlan(cursorPageRows);

      expectIndexBackedPlan(firstPagePlan);
      expectIndexBackedPlan(cursorPagePlan);
      expect(firstPagePlan).toContain('TravelPlanRequest_userId_createdAt_idx');
      expect(cursorPagePlan).toContain('TravelPlanRequest_userId_createdAt_idx');
    });
  });
});
