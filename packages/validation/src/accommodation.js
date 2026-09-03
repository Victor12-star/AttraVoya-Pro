/**
 * Provider-neutral accommodation preference validation.
 *
 * These schemas model what the traveller wants, not what a specific external
 * provider happens to support. Provider adapters later translate the request
 * into each provider's query capabilities without leaking provider vocabulary
 * into the rest of AttraVoya Pro.
 */
import { z } from 'zod';

import {
  ACCOMMODATION_TYPES,
  STAY_AMENITIES,
  STAY_NEAR_PRIORITIES,
  STAY_PREFERENCE_LEVELS,
  STAY_UNIT_TYPES,
} from '@attravoya/constants';

const enumValues = (object) => Object.values(object);

const accommodationTypeSchema = z.enum(enumValues(ACCOMMODATION_TYPES));
const stayUnitTypeSchema = z.enum(enumValues(STAY_UNIT_TYPES));
const preferenceLevelSchema = z.enum(enumValues(STAY_PREFERENCE_LEVELS));
const stayAmenitySchema = z.enum(enumValues(STAY_AMENITIES));
const stayNearPrioritySchema = z.enum(enumValues(STAY_NEAR_PRIORITIES));

export const accommodationPreferencesSchema = z
  .object({
    types: z.array(accommodationTypeSchema).min(1).max(15).default([
      ACCOMMODATION_TYPES.HOTEL,
      ACCOMMODATION_TYPES.GUEST_HOUSE,
      ACCOMMODATION_TYPES.HOSTEL,
      ACCOMMODATION_TYPES.SHORT_TERM_RENTAL,
    ]),
    unitType: stayUnitTypeSchema.default(STAY_UNIT_TYPES.ANY),
    breakfast: preferenceLevelSchema.default(STAY_PREFERENCE_LEVELS.NOT_REQUIRED),
    kitchen: preferenceLevelSchema.default(STAY_PREFERENCE_LEVELS.NOT_REQUIRED),
    privateBathroom: preferenceLevelSchema.default(STAY_PREFERENCE_LEVELS.NOT_REQUIRED),
    requiredAmenities: z.array(stayAmenitySchema).max(20).default([]),
    preferredAmenities: z.array(stayAmenitySchema).max(20).default([]),
    nearPriorities: z.array(stayNearPrioritySchema).max(8).default([]),
    maxNightlyAmount: z.number().positive().max(10_000_000).optional(),
    maxTotalStayAmount: z.number().positive().max(100_000_000).optional(),
    longStayFriendly: z.boolean().default(false),
    familyFriendly: z.boolean().default(false),
  })
  .strict()
  .superRefine((data, context) => {
    const required = new Set(data.requiredAmenities);

    for (const amenity of data.preferredAmenities) {
      if (required.has(amenity)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${amenity} cannot be both required and preferred`,
          path: ['preferredAmenities'],
        });
      }
    }
  });
