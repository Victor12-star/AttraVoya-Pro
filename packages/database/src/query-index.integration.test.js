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
