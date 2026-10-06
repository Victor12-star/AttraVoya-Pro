import { z } from 'zod';

const userRegistrationQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(90).default(7),
  })
  .strict();

const userRegistrationResponseSchema = z.object({
  window: z.object({
    days: z.number().int().min(1).max(90),
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  users: z.object({
    totalRegistered: z.number().int().nonnegative(),
    newRegistered: z.number().int().nonnegative(),
  }),
});

export const analyticsSchemas = Object.freeze({
  userRegistrations: {
    querystring: userRegistrationQuerySchema,
    response: { 200: userRegistrationResponseSchema },
  },
});
