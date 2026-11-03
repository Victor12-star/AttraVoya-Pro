import { z } from 'zod';

import { emailSchema, passwordSchema } from '@attravoya/validation';

export const usersSchemas = Object.freeze({
  manageAdminRole: {
    body: z
      .object({
        email: emailSchema,
        currentPassword: z.string().min(1).max(128),
        action: z.enum(['grant', 'revoke']),
      })
      .strict(),
  },
  deleteCurrentAccount: {
    body: z
      .object({
        password: passwordSchema,
      })
      .strict(),
  },
});
