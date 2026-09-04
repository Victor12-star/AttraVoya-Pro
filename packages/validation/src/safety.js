import { z } from 'zod';

const countryCode = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Za-z]{2}$/)
  .transform((value) => value.toUpperCase());

/**
 * Public emergency lookup is intentionally country-scoped in this foundation.
 * Region-specific records are not returned unless a later verified contract
 * can match destination regions reliably.
 */
export const emergencyCountryQuerySchema = z
  .object({
    countryCode,
  })
  .strict();
