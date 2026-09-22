import { ENTITLEMENTS, PLAN_LIMITS, PLANS, PRO_PLAN_KEYS } from '@attravoya/constants';

const PRO_PLAN_SET = new Set(PRO_PLAN_KEYS);
const ENTITLEMENT_ORDER = Object.freeze(Object.values(ENTITLEMENTS));
const ENTITLEMENT_SET = new Set(ENTITLEMENT_ORDER);

const PLAN_NAMES = Object.freeze({
  [PLANS.FREE]: 'Free',
  [PLANS.PRO_MONTHLY]: 'Pro Monthly',
  [PLANS.PRO_YEARLY]: 'Pro Yearly',
});

function validDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function planLimits(planKey) {
  const limits = PLAN_LIMITS[planKey] ?? PLAN_LIMITS[PLANS.FREE];
  return {
    maxTrips: limits.MAX_TRIPS,
    maxFavorites: limits.MAX_FAVORITES,
    offlineMaps: limits.OFFLINE_MAPS,
  };
}

function freeAccess() {
  return {
    plan: {
      key: PLANS.FREE,
      tier: 'FREE',
      name: PLAN_NAMES[PLANS.FREE],
    },
    entitlements: [],
    limits: planLimits(PLANS.FREE),
    subscription: null,
  };
}

function entitlementKeys(record) {
  const present = new Set(
    Array.isArray(record?.plan?.entitlements)
      ? record.plan.entitlements
          .map((entry) => entry?.entitlement?.key)
          .filter((key) => ENTITLEMENT_SET.has(key))
      : [],
  );

  return ENTITLEMENT_ORDER.filter((key) => present.has(key));
}

export function createEntitlementsService(repository, options = {}) {
  if (!repository?.findActiveProSubscription) {
    throw new TypeError('Entitlements repository is required.');
  }

  const now = options.now ?? (() => new Date());

  return {
    async getCurrentAccess({ userId }) {
      const evaluatedAt = now();
      if (!validDate(evaluatedAt)) throw new TypeError('A valid current time is required.');

      const subscription = await repository.findActiveProSubscription({
        userId,
        now: evaluatedAt,
      });
      const planKey = subscription?.plan?.key;
      const status = subscription?.status;
      const currentPeriodEnd = subscription?.currentPeriodEnd;

      // Fail closed. Only a server-recognized Pro plan with a currently
      // effective subscription window can unlock paid capabilities. Legacy,
      // unknown, expired or malformed records resolve to Free.
      if (
        !PRO_PLAN_SET.has(planKey) ||
        (status !== 'ACTIVE' && status !== 'TRIALING') ||
        !validDate(currentPeriodEnd) ||
        currentPeriodEnd <= evaluatedAt
      ) {
        return freeAccess();
      }

      return {
        plan: {
          key: planKey,
          tier: 'PRO',
          name: PLAN_NAMES[planKey],
        },
        entitlements: entitlementKeys(subscription),
        limits: planLimits(planKey),
        subscription: {
          status,
          currentPeriodEnd: currentPeriodEnd.toISOString(),
        },
      };
    },
  };
}
