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
  stripeCheckout: {
    body: stripeCheckoutBodySchema,
    response: {
      200: stripeCheckoutResponseSchema,
    },
  },
});
