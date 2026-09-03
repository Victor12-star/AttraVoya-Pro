/**
 * Zod validation schemas for global search inputs.
 */
import { z } from 'zod';

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(200),
    type: z.enum(['destinations', 'all']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
