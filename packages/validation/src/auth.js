/**
 * Zod validation schemas for authentication inputs.
 * Zod 4 API. Schemas are shared by the Fastify routes (via fastify-type-provider-zod)
 * and any client-side validation that reuses this package.
 */
import { z } from 'zod';

/** Shared email shape. */
export const emailSchema = z.string().trim().toLowerCase().email();

/** Shared password policy: 8–128 chars, must contain a letter and a number. */
export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();


export const verifyEmailSchema = z
  .object({
    token: z.string().trim().min(20).max(512),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
  })
  .strict();
