-- Track the provider's authoritative state timestamp separately from local
-- updatedAt so delayed billing events cannot roll a newer subscription state back.
ALTER TABLE "Subscription"
ADD COLUMN "providerStateUpdatedAt" TIMESTAMP(3);
