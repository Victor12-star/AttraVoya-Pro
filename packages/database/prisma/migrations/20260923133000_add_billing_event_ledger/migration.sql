-- CreateEnum
CREATE TYPE "BillingEventProcessingStatus" AS ENUM ('PENDING', 'APPLIED', 'IGNORED', 'FAILED');

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "processingStatus" "BillingEventProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "occurredAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "failureCode" VARCHAR(80),
    "subscriptionId" TEXT,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_provider_externalEventId_key" ON "BillingEvent"("provider", "externalEventId");

-- CreateIndex
CREATE INDEX "BillingEvent_processingStatus_receivedAt_idx" ON "BillingEvent"("processingStatus", "receivedAt");

-- CreateIndex
CREATE INDEX "BillingEvent_subscriptionId_receivedAt_idx" ON "BillingEvent"("subscriptionId", "receivedAt");

-- CreateIndex
CREATE INDEX "BillingEvent_provider_eventType_receivedAt_idx" ON "BillingEvent"("provider", "eventType", "receivedAt");

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
