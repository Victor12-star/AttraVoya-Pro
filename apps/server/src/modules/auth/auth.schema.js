import { z } from 'zod';

import {
  forgotPasswordSchema,
  passwordSchema,
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
  changePassword: {
    body: z
      .object({
        currentPassword: z.string().min(1).max(128),
        newPassword: passwordSchema,
      })
      .strict(),
  },
  mobileSession: {
    body: mobileSessionSchema,
  },
});
