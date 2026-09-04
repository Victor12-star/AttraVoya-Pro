/**
 * Zod validation schemas for trip inputs.
 */
import { z } from 'zod';

/** ISO date string in yyyy-mm-dd form. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in yyyy-mm-dd format');

export const createTripSchema = z
  .object({
    destinationId: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(160),
    startDate: isoDate,
    endDate: isoDate,
  })
  .strict()
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export const updateTripSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
  })
  .strict();

export const tripParamsSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict();
