/**
 * Validation for AttraVoya Pro's budget-first planner.
 * The planner supports both "I know where I want to go" and the differentiating
 * "show me where my budget can take me" flow, so targetDestinationId is optional.
 */
import { z } from 'zod';

import { accommodationPreferencesSchema } from './accommodation.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be yyyy-mm-dd');

const childrenAgesSchema = z
  .array(z.number().int().min(0).max(17))
  .max(12, 'A planning request supports up to 12 children');

export const createBudgetPlanRequestSchema = z
  .object({
    originLabel: z.string().trim().min(2).max(160),
    originCityId: z.string().trim().min(1).optional(),
    originAirportId: z.string().trim().min(1).optional(),
    targetDestinationId: z.string().trim().min(1).optional(),
    fixedDeparture: isoDate.optional(),
    fixedReturn: isoDate.optional(),
    earliestDeparture: isoDate.optional(),
    latestReturn: isoDate.optional(),
    flexibleDates: z.boolean().default(true),
    minNights: z.number().int().min(1).max(90).default(2),
    maxNights: z.number().int().min(1).max(90).default(14),
    budgetAmount: z.number().positive().max(10_000_000),
    budgetCurrencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    adults: z.number().int().min(1).max(20).default(1),
    childrenAges: childrenAgesSchema.default([]),
    interests: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    comfortLevel: z.enum(['BUDGET', 'VALUE', 'COMFORT', 'PREMIUM']).default('VALUE'),
    safetyReservePercent: z.number().min(0).max(30).default(7.5),
    accommodation: accommodationPreferencesSchema.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.minNights > data.maxNights) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum nights cannot exceed maximum nights',
        path: ['minNights'],
      });
    }

    const hasFixedDates = Boolean(data.fixedDeparture || data.fixedReturn);
    if (hasFixedDates && !(data.fixedDeparture && data.fixedReturn)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Both fixed departure and return dates are required',
        path: ['fixedReturn'],
      });
    }

    if (data.fixedDeparture && data.fixedReturn && data.fixedReturn < data.fixedDeparture) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Return date must be on or after departure date',
        path: ['fixedReturn'],
      });
    }

    const hasFlexibleWindow = Boolean(data.earliestDeparture || data.latestReturn);
    if (hasFlexibleWindow && !(data.earliestDeparture && data.latestReturn)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Both earliest departure and latest return are required for a flexible window',
        path: ['latestReturn'],
      });
    }

    if (
      data.earliestDeparture &&
      data.latestReturn &&
      data.latestReturn < data.earliestDeparture
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latest return must be on or after earliest departure',
        path: ['latestReturn'],
      });
    }
  });
