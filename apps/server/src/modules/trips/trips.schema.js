import { z } from 'zod';

const tripSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['ACTIVE', 'PLANNED']),
  startDate: z.string(),
  endDate: z.string(),
  destination: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    countryCode: z.string(),
    countryName: z.string(),
  }),
});

const companionContextResponseSchema = z.object({
  tripContext: z.object({
    suggestedTripId: z.string().nullable(),
    source: z.enum(['ACTIVE_TRIP', 'PLANNED_TRIP']).nullable(),
    trips: z.array(tripSchema).max(10),
  }),
});

export const tripsSchemas = Object.freeze({
  companionContext: {
    response: { 200: companionContextResponseSchema },
  },
});
