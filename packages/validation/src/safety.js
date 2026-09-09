import { z } from 'zod';

const countryCode = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Za-z]{2}$/)
  .transform((value) => value.toUpperCase());

const countryName = z.string().trim().min(2).max(160);

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

/**
 * Consular discovery accepts both ISO codes and the reference-data names that
 * Geoapify needs for boundary/name searches. Clients should source these names
 * from AttraVoya's country reference endpoint rather than free-form text.
 */
export const consularMissionQuerySchema = z
  .object({
    hostCountryCode: countryCode,
    hostCountryName: countryName,
    citizenshipCountryCode: countryCode,
    citizenshipCountryName: countryName,
    limit: z.coerce.number().int().min(1).max(8).default(5),
    language: z
      .string()
      .trim()
      .min(2)
      .max(10)
      .regex(/^[A-Za-z-]+$/)
      .default('en'),
  })
  .strict();
