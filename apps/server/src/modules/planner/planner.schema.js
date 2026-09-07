import { z } from 'zod';

import { createBudgetPlanRequestSchema } from '@attravoya/validation';

const idempotencyHeadersSchema = z
  .object({
    'idempotency-key': z
      .string()
      .trim()
      .min(8, 'Idempotency-Key must be at least 8 characters')
      .max(128, 'Idempotency-Key must be at most 128 characters')
      .regex(
        /^[A-Za-z0-9._~:-]+$/,
        'Idempotency-Key may contain letters, numbers, dot, underscore, tilde, colon, and hyphen',
      ),
  })
  .passthrough();
const listRequestsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).max(512).optional(),
  })
  .strict();
const requestIdParamsSchema = z.object({ requestId: z.string().trim().min(1).max(128) }).strict();
const candidateEvidenceParamsSchema = z
  .object({
    requestId: z.string().trim().min(1).max(128),
    destinationId: z.string().trim().min(1).max(128),
  })
  .strict();

export const plannerSchemas = Object.freeze({
  createRequest: { headers: idempotencyHeadersSchema, body: createBudgetPlanRequestSchema },
  listRequests: { querystring: listRequestsQuerySchema },
  getRequest: { params: requestIdParamsSchema },
  getCandidateEvidence: { params: candidateEvidenceParamsSchema },
});
