-- Durable server-owned checkout ownership/idempotency ledger.
CREATE TYPE "CheckoutAttemptStatus" AS ENUM (
  'PENDING',
  'SESSION_CREATED',
  'COMPLETED',
  'CANCELED',
  'EXPIRED',
  'FAILED'
);

CREATE TABLE "CheckoutAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "CheckoutAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "activeUserKey" TEXT,
  "externalCheckoutSessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),

  CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckoutAttempt_activeUserKey_key"
ON "CheckoutAttempt"("activeUserKey");

CREATE UNIQUE INDEX "CheckoutAttempt_provider_externalCheckoutSessionId_key"
ON "CheckoutAttempt"("provider", "externalCheckoutSessionId");

CREATE INDEX "CheckoutAttempt_userId_status_createdAt_idx"
ON "CheckoutAttempt"("userId", "status", "createdAt");

CREATE INDEX "CheckoutAttempt_planId_status_idx"
ON "CheckoutAttempt"("planId", "status");

CREATE INDEX "CheckoutAttempt_provider_status_createdAt_idx"
ON "CheckoutAttempt"("provider", "status", "createdAt");

ALTER TABLE "CheckoutAttempt"
ADD CONSTRAINT "CheckoutAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutAttempt"
ADD CONSTRAINT "CheckoutAttempt_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "Plan"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
