/**
 * Zod validation schemas for destination inputs.
 */
import { z } from 'zod';

const destinationLanguageCode = z
  .string()
  .trim()
  .min(2)
  .max(10)
  .regex(/^[A-Za-z-]+$/);

const destinationCountryCode = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Za-z]{2}$/)
  .transform((value) => value.toUpperCase());

/** Path parameter schema for /destinations/:slug routes. */
export const destinationParamsSchema = z
  .object({
    slug: z.string().trim().min(1).max(120),
  })
  .strict();

/** Query-string schema for curated destination listing/search. */
export const destinationQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    countryCode: destinationCountryCode.optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

/**
 * Public global destination discovery contract.
 *
 * This is intentionally narrower than generic place autocomplete: travellers
 * are selecting a city/town destination, not a street address or business.
 */
export const destinationSearchQuerySchema = z
  .object({
    query: z.string().trim().min(2).max(120),
    countryCode: destinationCountryCode.optional(),
    language: destinationLanguageCode.default('en'),
    limit: z.coerce.number().int().min(1).max(20).default(12),
  })
  .strict();

/** Body schema for creating/updating a destination (admin only). */
export const destinationUpsertSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    countryCode: destinationCountryCode,
    cityName: z.string().trim().min(1).max(120).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    summary: z.string().trim().max(2000).optional(),
    imageUrl: z.string().url().optional(),
  })
  .strict();
