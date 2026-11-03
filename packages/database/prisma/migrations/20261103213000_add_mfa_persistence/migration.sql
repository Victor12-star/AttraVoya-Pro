-- Additive, inactive MFA storage only. No existing user is enrolled or challenged.
-- MFA enforcement and enrollment require separate reviewed application changes.
CREATE TABLE "MfaTotpCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "secretEnvelope" TEXT NOT NULL,
  "pendingExpiresAt" TIMESTAMP(3),
  "enabledAt" TIMESTAMP(3),
  "lastAcceptedCounter" INTEGER NOT NULL DEFAULT -1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MfaTotpCredential_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MfaTotpCredential_lastAcceptedCounter_check" CHECK ("lastAcceptedCounter" >= -1),
  CONSTRAINT "MfaTotpCredential_secretEnvelope_check" CHECK (length("secretEnvelope") BETWEEN 1 AND 256)
);

CREATE UNIQUE INDEX "MfaTotpCredential_userId_key" ON "MfaTotpCredential"("userId");
CREATE INDEX "MfaTotpCredential_pendingExpiresAt_idx" ON "MfaTotpCredential"("pendingExpiresAt");
CREATE INDEX "MfaTotpCredential_enabledAt_idx" ON "MfaTotpCredential"("enabledAt");
ALTER TABLE "MfaTotpCredential" ADD CONSTRAINT "MfaTotpCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MfaRecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MfaRecoveryCode_codeHash_check" CHECK (length("codeHash") = 64)
);
CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key" ON "MfaRecoveryCode"("codeHash");
CREATE INDEX "MfaRecoveryCode_userId_usedAt_idx" ON "MfaRecoveryCode"("userId", "usedAt");
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MfaChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "challengeHash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MfaChallenge_attempts_check" CHECK ("attempts" BETWEEN 0 AND 10),
  CONSTRAINT "MfaChallenge_challengeHash_check" CHECK (length("challengeHash") = 64)
);
CREATE UNIQUE INDEX "MfaChallenge_challengeHash_key" ON "MfaChallenge"("challengeHash");
CREATE INDEX "MfaChallenge_userId_expiresAt_idx" ON "MfaChallenge"("userId", "expiresAt");
CREATE INDEX "MfaChallenge_expiresAt_consumedAt_idx" ON "MfaChallenge"("expiresAt", "consumedAt");
ALTER TABLE "MfaChallenge" ADD CONSTRAINT "MfaChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
