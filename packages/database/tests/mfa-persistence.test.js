import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const schema = fs.readFileSync(
  path.resolve(import.meta.dirname, '../prisma/schema.prisma'),
  'utf8',
);
const migration = fs.readFileSync(
  path.resolve(
    import.meta.dirname,
    '../prisma/migrations/20261103213000_add_mfa_persistence/migration.sql',
  ),
  'utf8',
);

describe('MFA persistence migration is additive and inactive', () => {
  it('defines one credential per user and separate recovery and challenge records', () => {
    expect(schema).toContain('model MfaTotpCredential {');
    expect(schema).toContain('model MfaRecoveryCode {');
    expect(schema).toContain('model MfaChallenge {');
    expect(schema).toContain('userId              String    @unique');
    expect(schema).toContain('lastAcceptedCounter Int       @default(-1)');
  });

  it('stores encrypted TOTP envelopes, recovery hashes, and one-time challenge hashes', () => {
    expect(schema).toContain('secretEnvelope');
    expect(schema).toContain('codeHash  String    @unique');
    expect(schema).toContain('challengeHash String    @unique');
    expect(schema).toContain('consumedAt');
    expect(migration).toContain('CHECK ("attempts" BETWEEN 0 AND 10)');
    expect(migration).toContain('CHECK ("lastAcceptedCounter" >= -1)');
  });

  it('has no raw recovery codes, plaintext TOTP columns, privileged roles or activation defaults', () => {
    expect(schema).not.toMatch(/(?:rawRecoveryCode|plaintextTotp|mfaSecretPlaintext)/);
    expect(migration).not.toMatch(/INSERT INTO|UPDATE "User"|ALTER TABLE "User"|SUPER_ADMIN|DEFAULT TRUE/i);
    expect(migration).not.toContain('CREATE EXTENSION');
  });

  it('uses restrictive uniqueness and account-scoped cascade relations', () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "MfaTotpCredential_userId_key"');
    expect(migration).toContain('CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key"');
    expect(migration).toContain('CREATE UNIQUE INDEX "MfaChallenge_challengeHash_key"');
    expect(migration.match(/ON DELETE CASCADE ON UPDATE CASCADE/g)).toHaveLength(3);
  });
});
