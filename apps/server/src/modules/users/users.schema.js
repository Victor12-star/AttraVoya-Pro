import { z } from 'zod';

import { emailSchema, passwordSchema } from '@attravoya/validation';

export const usersSchemas = Object.freeze({
  adminDirectory: {
    querystring: z
      .object({
        page: z.coerce.number().int().min(1).max(1000).default(1),
        limit: z.coerce.number().int().min(1).max(20).default(20),
      })
      .strict(),
  },
  inviteAdministrator: {
    body: z
      .object({
        email: emailSchema,
        currentPassword: z.string().min(1).max(128),
      })
      .strict(),
  },
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
