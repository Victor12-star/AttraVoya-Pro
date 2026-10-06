import { PERMISSIONS, ROLES } from '@attravoya/constants';

import { createAnalyticsController } from './analytics.controller.js';
import { analyticsRepository } from './analytics.repository.js';
import { analyticsSchemas } from './analytics.schema.js';
import { createAnalyticsService } from './analytics.service.js';

const ANALYTICS_READ_RATE_LIMIT = Object.freeze({ max: 30, timeWindow: '1 minute' });

export async function analyticsRoutes(app, options = {}) {
  const repository = options.repository ?? analyticsRepository;
  const service = createAnalyticsService(repository, { now: options.now });
  const controller = createAnalyticsController(service);
  const protectedApp = /** @type {any} */ (app);

  const analyticsRead = {
    onRequest: [
      protectedApp.authenticate,
      protectedApp.authorize({
        minimumRole: ROLES.ADMIN,
        allPermissions: [PERMISSIONS.ANALYTICS_READ],
      }),
    ],
    config: { rateLimit: ANALYTICS_READ_RATE_LIMIT },
  };

  app.get(
    '/users',
    {
      ...analyticsRead,
      schema: analyticsSchemas.userRegistrations,
    },
    controller.getUserRegistrationSummary,
  );
}
