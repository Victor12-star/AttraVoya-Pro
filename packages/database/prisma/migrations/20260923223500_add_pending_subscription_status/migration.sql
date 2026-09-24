-- New Stripe checkout ownership is created as non-entitling PENDING state.
-- A later separately verified subscription lifecycle event may promote it.
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING';
