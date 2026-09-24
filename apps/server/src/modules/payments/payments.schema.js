import { PLANS } from '@attravoya/constants';
import { z } from 'zod';

const stripeCheckoutBodySchema = z
  .object({
    planKey: z.enum([PLANS.PRO_MONTHLY, PLANS.PRO_YEARLY]),
  })
  .strict();

const stripeCheckoutResponseSchema = z
  .object({
    checkoutUrl: z.string().url(),
  })
  .strict();

const stripePlanSchema = z
  .object({
    planKey: z.enum([PLANS.PRO_MONTHLY, PLANS.PRO_YEARLY]),
    name: z.string().trim().min(1).max(80),
    unitAmount: z.number().int().positive(),
    currency: z.string().regex(/^[a-z]{3}$/),
    interval: z.enum(['month', 'year']),
  })
  .strict();

const stripePlanCatalogResponseSchema = z
  .object({
    plans: z.array(stripePlanSchema).length(2),
  })
  .strict();

const stripeCheckoutAvailabilityResponseSchema = z
  .object({
    available: z.boolean(),
    planKeys: z.array(z.enum([PLANS.PRO_MONTHLY, PLANS.PRO_YEARLY])).max(2),
  })
  .strict();

export const paymentsSchemas = Object.freeze({
  stripeCheckoutAvailability: {
    response: {
      200: stripeCheckoutAvailabilityResponseSchema,
    },
  },
  stripePlanCatalog: {
    response: {
      200: stripePlanCatalogResponseSchema,
    },
  },
  stripeCheckout: {
    body: stripeCheckoutBodySchema,
    response: {
      200: stripeCheckoutResponseSchema,
    },
  },
});
