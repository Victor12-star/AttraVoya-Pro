-- CreateTable
CREATE TABLE "BillingEventReceipt" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "externalEventId" VARCHAR(255) NOT NULL,
    "eventType" VARCHAR(160) NOT NULL,
    "payloadSha256" CHAR(64) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEventReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingEventReceipt_provider_externalEventId_key"
ON "BillingEventReceipt"("provider", "externalEventId");

-- CreateIndex
CREATE INDEX "BillingEventReceipt_provider_processedAt_idx"
ON "BillingEventReceipt"("provider", "processedAt");
