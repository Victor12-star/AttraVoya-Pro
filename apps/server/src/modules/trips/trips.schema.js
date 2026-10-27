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

const ownedTripSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELED']),
  startDate: z.string(),
  endDate: z.string(),
  destination: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
  }),
});

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'A valid calendar date is required.');

const createTripBodySchema = z
  .object({
    destinationId: z.string().min(1).max(128),
    title: z.string().trim().min(1).max(240),
    startDate: calendarDate,
    endDate: calendarDate,
  })
  .strict()
  .refine((trip) => trip.endDate >= trip.startDate, {
    message: 'End date must not precede start date.',
    path: ['endDate'],
  });

export const tripsSchemas = Object.freeze({
  create: {
    body: createTripBodySchema,
    response: { 201: z.object({ trip: ownedTripSchema }) },
  },
  listOwned: {
    response: { 200: z.object({ trips: z.array(ownedTripSchema).max(50) }) },
  },
  companionContext: {
    response: { 200: companionContextResponseSchema },
  },
});
