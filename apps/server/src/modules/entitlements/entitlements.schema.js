import { z } from 'zod';

import { ENTITLEMENTS, PLANS } from '@attravoya/constants';

const planKeySchema = z.enum([PLANS.FREE, PLANS.PRO_MONTHLY, PLANS.PRO_YEARLY]);
const entitlementSchema = z.enum(Object.values(ENTITLEMENTS));
const limitSchema = z.number().int().nonnegative().nullable();

const accessSchema = z
  .object({
    plan: z
      .object({
        key: planKeySchema,
        tier: z.enum(['FREE', 'PRO']),
        name: z.string().min(1).max(80),
      })
      .strict(),
    entitlements: z.array(entitlementSchema).max(Object.values(ENTITLEMENTS).length),
    limits: z
      .object({
        maxTrips: limitSchema,
        maxFavorites: limitSchema,
        offlineMaps: limitSchema,
      })
      .strict(),
    subscription: z
      .object({
        status: z.enum(['ACTIVE', 'TRIALING']),
        currentPeriodEnd: z.string(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const entitlementsSchemas = Object.freeze({
  currentAccess: {
    response: {
      200: z.object({ access: accessSchema }).strict(),
    },
  },
});
