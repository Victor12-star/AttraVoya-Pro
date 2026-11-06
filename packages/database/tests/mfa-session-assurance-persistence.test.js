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
    '../prisma/migrations/20261106170000_add_mfa_session_assurance/migration.sql',
  ),
  'utf8',
);

describe('inactive MFA session assurance persistence', () => {
  it('binds proof to an existing authenticated session and matching user', () => {
    expect(schema).toContain('model MfaSessionAssurance {');
    expect(schema).toContain('sessionId  String   @id');
    expect(schema).toContain('@@unique([id, userId])');
    expect(schema).toContain(
      '@relation(fields: [sessionId, userId], references: [id, userId], onDelete: Cascade)',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("sessionId", "userId") REFERENCES "AuthSession"("id", "userId")',
    );
  });

  it('supports bounded and revocable persisted verification without plaintext factors', () => {
    for (const field of ['verifiedAt DateTime', 'expiresAt  DateTime', 'revokedAt  DateTime?']) {
      expect(schema).toContain(field);
    }
    expect(migration).toContain('CHECK ("expiresAt" > "verifiedAt")');
    expect(migration).not.toMatch(/totpSecret|recoveryCode|plaintext|refreshTokenHash/i);
  });

  it('adds only inactive schema and never mutates existing account authorization', () => {
    expect(migration).toContain('CREATE TABLE "MfaSessionAssurance"');
    expect(migration).not.toMatch(
      /INSERT INTO|UPDATE "User"|ALTER TABLE "User"|SUPER_ADMIN|CREATE EXTENSION/i,
    );
    expect(migration).toContain('ON DELETE CASCADE');
  });
});
