-- Server-owned opaque RevenueCat subscriber identity.
-- One AttraVoya user maps to exactly one non-guessable RevenueCat App User ID,
-- and one App User ID can never claim two AttraVoya accounts.
CREATE TABLE "RevenueCatSubscriberIdentity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "appUserId" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RevenueCatSubscriberIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevenueCatSubscriberIdentity_userId_key"
ON "RevenueCatSubscriberIdentity"("userId");

CREATE UNIQUE INDEX "RevenueCatSubscriberIdentity_appUserId_key"
ON "RevenueCatSubscriberIdentity"("appUserId");

CREATE INDEX "RevenueCatSubscriberIdentity_createdAt_idx"
ON "RevenueCatSubscriberIdentity"("createdAt");

ALTER TABLE "RevenueCatSubscriberIdentity"
ADD CONSTRAINT "RevenueCatSubscriberIdentity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
