import { z } from 'zod';

import { createBudgetPlanRequestSchema } from '@attravoya/validation';

const requestIdParamsSchema = z.object({ requestId: z.string().trim().min(1).max(128) }).strict();

export const plannerSchemas = Object.freeze({
  createRequest: { body: createBudgetPlanRequestSchema },
  getRequest: { params: requestIdParamsSchema },
});
