-- One provider subscription must resolve to at most one AttraVoya
-- subscription. PostgreSQL permits multiple NULL values, so local/free rows
-- without provider identity remain valid.
CREATE UNIQUE INDEX "Subscription_provider_externalSubscriptionId_key"
ON "Subscription"("provider", "externalSubscriptionId");
