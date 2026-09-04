import { z } from 'zod';
import { ACCOMMODATION_TYPES, PLACE_CATEGORY_GROUP_VALUES } from '@attravoya/constants';

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);
const languageCode = z
  .string()
  .trim()
  .min(2)
  .max(10)
  .regex(/^[A-Za-z-]+$/);
const currencyCode = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Za-z]{3}$/)
  .transform((value) => value.toUpperCase());

export const weatherQuerySchema = z
  .object({
    latitude,
    longitude,
    forecastDays: z.coerce.number().int().min(1).max(16).default(7),
    timezone: z.string().trim().min(1).max(64).default('auto'),
  })
  .strict();

export const currencyRatesQuerySchema = z
  .object({
    base: currencyCode.default('EUR'),
    quotes: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) =>
        value
          ? value
              .split(',')
              .map((item) => item.trim().toUpperCase())
              .filter(Boolean)
          : [],
      ),
  })
  .strict();

export const currencyConvertQuerySchema = z
  .object({
    amount: z.coerce.number().positive().max(100_000_000),
    from: currencyCode,
    to: currencyCode,
  })
  .strict();

export const placesAutocompleteQuerySchema = z
  .object({
    query: z.string().trim().min(2).max(200),
    limit: z.coerce.number().int().min(1).max(20).default(8),
    language: languageCode.default('en'),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    biasLatitude: latitude.optional(),
    biasLongitude: longitude.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.biasLatitude === undefined) !== (value.biasLongitude === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['biasLatitude'],
        message: 'biasLatitude and biasLongitude must be provided together',
      });
    }
  });

export const placesNearbyQuerySchema = z
  .object({
    categoryGroup: z.enum(PLACE_CATEGORY_GROUP_VALUES),
    latitude,
    longitude,
    radiusMeters: z.coerce.number().int().min(100).max(50_000).default(5000),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    language: languageCode.default('en'),
  })
  .strict();

export const translationBodySchema = z
  .object({
    text: z.string().trim().min(1).max(3000),
    source: z.union([z.literal('auto'), languageCode]).default('auto'),
    target: languageCode,
  })
  .strict()
  .refine((value) => value.source === 'auto' || value.source !== value.target, {
    message: 'Source and target languages must be different.',
    path: ['target'],
  });

const accommodationTypeValues = /** @type {readonly string[]} */ (
  Object.values(ACCOMMODATION_TYPES)
);
export const accommodationNearbyQuerySchema = z
  .object({
    latitude,
    longitude,
    radiusMeters: z.coerce.number().int().min(100).max(50_000).default(5000),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    language: languageCode.default('en'),
    types: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((value) =>
        value
          ? value
              .split(',')
              .map((item) => item.trim().toUpperCase())
              .filter(Boolean)
          : [],
      ),
  })
  .strict()
  .superRefine((value, context) => {
    value.types.forEach((type, index) => {
      if (!accommodationTypeValues.includes(type)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['types', index],
          message: `Unsupported accommodation type: ${type}`,
        });
      }
    });
  });
