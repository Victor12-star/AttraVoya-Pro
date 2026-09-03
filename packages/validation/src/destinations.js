/**
 * Zod validation schemas for destination inputs.
 */
import { z } from 'zod';

/** Path parameter schema for /destinations/:slug routes. */
export const destinationParamsSchema = z
  .object({
    slug: z.string().trim().min(1).max(120),
  })
  .strict();

/** Query-string schema for destination listing/search. */
export const destinationQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    countryCode: z.string().trim().toUpperCase().length(2).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

/** Body schema for creating/updating a destination (admin only). */
export const destinationUpsertSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    countryCode: z.string().trim().toUpperCase().length(2),
    cityName: z.string().trim().min(1).max(120).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    summary: z.string().trim().max(2000).optional(),
    imageUrl: z.string().url().optional(),
  })
  .strict();
