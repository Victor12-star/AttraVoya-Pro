-- Additive, inactive MFA session assurance storage. No existing sessions are enrolled.
-- Composite foreign key prevents cross-account session assurance.
CREATE UNIQUE INDEX "AuthSession_id_userId_key" ON "AuthSession"("id", "userId");

CREATE TABLE "MfaSessionAssurance" (
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MfaSessionAssurance_pkey" PRIMARY KEY ("sessionId"),
  CONSTRAINT "MfaSessionAssurance_time_check" CHECK ("expiresAt" > "verifiedAt")
);

CREATE UNIQUE INDEX "MfaSessionAssurance_sessionId_userId_key" ON "MfaSessionAssurance"("sessionId", "userId");
CREATE INDEX "MfaSessionAssurance_userId_expiresAt_idx" ON "MfaSessionAssurance"("userId", "expiresAt");
CREATE INDEX "MfaSessionAssurance_expiresAt_revokedAt_idx" ON "MfaSessionAssurance"("expiresAt", "revokedAt");
ALTER TABLE "MfaSessionAssurance" ADD CONSTRAINT "MfaSessionAssurance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaSessionAssurance" ADD CONSTRAINT "MfaSessionAssurance_sessionId_userId_fkey"
  FOREIGN KEY ("sessionId", "userId") REFERENCES "AuthSession"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
