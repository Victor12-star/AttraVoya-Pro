import { z } from 'zod';

import { passwordSchema } from '@attravoya/validation';

export const usersSchemas = Object.freeze({
  deleteCurrentAccount: {
    body: z
      .object({
        password: passwordSchema,
      })
      .strict(),
  },
});
