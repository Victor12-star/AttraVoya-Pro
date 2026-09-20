import { env } from '../../config/env.js';
import { createUsersController } from './users.controller.js';
import { usersRepository } from './users.repository.js';
import { usersSchemas } from './users.schema.js';
import { createUsersService } from './users.service.js';

const ACCOUNT_DELETION_RATE_LIMIT = Object.freeze({ max: 5, timeWindow: '15 minutes' });

export async function usersRoutes(app, options = {}) {
  const repository = options.repository ?? usersRepository;
  const service = createUsersService(repository);
  const controller = createUsersController({ service, env });
  const protectedApp = /** @type {any} */ (app);

  app.delete('/me', {
    onRequest: [protectedApp.authenticate],
    schema: usersSchemas.deleteCurrentAccount,
    config: { rateLimit: ACCOUNT_DELETION_RATE_LIMIT },
    handler: controller.deleteCurrentAccount,
  });
}
