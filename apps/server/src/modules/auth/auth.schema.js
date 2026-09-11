import { z } from 'zod';

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@attravoya/validation';

const sessionIdParamsSchema = z.object({ sessionId: z.string().trim().min(1).max(128) }).strict();

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
});
