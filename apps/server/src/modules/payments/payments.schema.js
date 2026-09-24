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

export const paymentsSchemas = Object.freeze({
  stripeCheckout: {
    body: stripeCheckoutBodySchema,
    response: {
      200: stripeCheckoutResponseSchema,
    },
  },
});
