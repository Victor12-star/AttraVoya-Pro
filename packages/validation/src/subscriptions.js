/**
 * Zod validation schemas for subscription inputs.
 */
import { z } from 'zod';
import { PLANS } from '@attravoya/constants';

export const checkoutSchema = z
  .object({
    plan: z.enum([PLANS.FREE, PLANS.PREMIUM]),
  })
  .strict();

export const subscriptionParamsSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict();
