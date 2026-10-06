import { z } from 'zod';

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@attravoya/validation';

const sessionIdParamsSchema = z.object({ sessionId: z.string().trim().min(1).max(128) }).strict();
const mobileSessionSchema = z
  .object({
    refreshToken: z.string().trim().min(32).max(256),
  })
  .strict();

const currentAuthResponseSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    status: z.string().min(1),
    emailVerified: z.boolean(),
    roles: z.array(z.string().min(1)),
    permissions: z.array(z.string().min(1)),
  }),
});

export const authSchemas = Object.freeze({
  register: {
    body: registerSchema,
  },
  login: {
    body: loginSchema,
  },
  forgotPassword: {
    body: forgotPasswordSchema,
  },
  resetPassword: {
    body: resetPasswordSchema,
  },
  verifyEmail: {
    body: verifyEmailSchema,
  },
  revokeSession: {
    params: sessionIdParamsSchema,
  },
  mobileSession: {
    body: mobileSessionSchema,
  },
  currentAuth: {
    response: { 200: currentAuthResponseSchema },
  },
});
