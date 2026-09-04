import { z } from 'zod';
import {
  ACCOMMODATION_TYPES,
  PLACE_CATEGORY_GROUP_VALUES,
} from '@attravoya/constants';

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

const eventDateTime = z.string().trim().datetime({ offset: true });
const eventSortValues = [
  'name,asc',
  'name,desc',
  'date,asc',
  'date,desc',
  'relevance,asc',
  'relevance,desc',
  'distance,asc',
  'random',
];

export const eventsQuerySchema = z
  .object({
    keyword: z.string().trim().min(1).max(150).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    classificationName: z.string().trim().min(1).max(100).optional(),
    latitude: latitude.optional(),
    longitude: longitude.optional(),
    radius: z.coerce.number().positive().max(500).default(25),
    unit: z.enum(['km', 'miles']).default('km'),
    startDateTime: eventDateTime.optional(),
    endDateTime: eventDateTime.optional(),
    locale: languageCode.default('en'),
    size: z.coerce.number().int().min(1).max(100).default(20),
    page: z.coerce.number().int().min(0).max(999).default(0),
    sort: z.enum(eventSortValues).default('date,asc'),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.latitude === undefined) !== (value.longitude === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latitude'],
        message: 'latitude and longitude must be provided together',
      });
    }

    if (
      value.startDateTime &&
      value.endDateTime &&
      Date.parse(value.startDateTime) > Date.parse(value.endDateTime)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDateTime'],
        message: 'endDateTime must be after startDateTime',
      });
    }

    if (value.size * value.page >= 1000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['page'],
        message: 'Ticketmaster deep paging supports only the first 1000 results',
      });
    }
  });

const newsLanguageCode = z
  .string()
  .trim()
  .min(2)
  .max(3)
  .regex(/^[A-Za-z]{2,3}$/)
  .transform((value) => value.toLowerCase());

export const newsQuerySchema = z
  .object({
    query: z.string().trim().min(1).max(200).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .regex(/^[A-Za-z]{2}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    language: newsLanguageCode.default('en'),
    categories: z
      .string()
      .trim()
      .max(250)
      .optional()
      .transform((value) =>
        value
          ? value
              .split(',')
              .map((item) => item.trim().toLowerCase())
              .filter(Boolean)
          : [],
      ),
    // The no-cost NewsData plan currently permits at most 10 results/request.
    // Keeping the public contract at that ceiling prevents accidental paid-plan dependency.
    size: z.coerce.number().int().min(1).max(10).default(10),
    page: z.string().trim().min(1).max(200).regex(/^\S+$/).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.categories.length > 5) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categories'],
        message: 'At most five news categories can be requested at once',
      });
    }

    value.categories.forEach((category, index) => {
      if (!/^[a-z][a-z _-]{1,39}$/.test(category)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['categories', index],
          message: `Invalid news category: ${category}`,
        });
      }
    });

    if (!value.query && !value.countryCode && value.categories.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['query'],
        message:
          'Provide a query, countryCode, or category to avoid an unbounded news request',
      });
    }
  });

const pexelsLocales = [
  'en-US',
  'pt-BR',
  'es-ES',
  'ca-ES',
  'de-DE',
  'it-IT',
  'fr-FR',
  'sv-SE',
  'id-ID',
  'pl-PL',
  'ja-JP',
  'zh-TW',
  'zh-CN',
  'ko-KR',
  'th-TH',
  'nl-NL',
  'hu-HU',
  'vi-VN',
  'cs-CZ',
  'da-DK',
  'fi-FI',
  'uk-UA',
  'el-GR',
  'ro-RO',
  'nb-NO',
  'sk-SK',
  'tr-TR',
  'ru-RU',
];
const pexelsColorNames = new Set([
  'red',
  'orange',
  'yellow',
  'green',
  'turquoise',
  'blue',
  'violet',
  'pink',
  'brown',
  'black',
  'gray',
  'white',
]);
const pexelsColor = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .transform((value) => value.toLowerCase())
  .refine(
    (value) => pexelsColorNames.has(value) || /^#[0-9a-f]{6}$/.test(value),
    'Use a supported Pexels color name or a six-digit hex color.',
  );

export const imagesSearchQuerySchema = z
  .object({
    query: z.string().trim().min(2).max(200),
    orientation: z.enum(['landscape', 'portrait', 'square']).optional(),
    size: z.enum(['large', 'medium', 'small']).optional(),
    color: pexelsColor.optional(),
    locale: z.enum(pexelsLocales).default('en-US'),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    perPage: z.coerce.number().int().min(1).max(80).default(15),
  })
  .strict();
