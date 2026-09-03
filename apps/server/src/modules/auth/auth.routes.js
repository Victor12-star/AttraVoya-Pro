import { env } from '../../config/env.js';
import { authRepository } from './auth.repository.js';
import { authSchemas } from './auth.schema.js';
import { createAuthService } from './auth.service.js';
import { createAuthController } from './auth.controller.js';

const STRICT_AUTH_RATE_LIMIT = Object.freeze({ max: 10, timeWindow: '1 minute' });
const PASSWORD_RESET_RATE_LIMIT = Object.freeze({ max: 5, timeWindow: '15 minutes' });

export async function authRoutes(app, options = {}) {
  const repository = options.repository ?? authRepository;
  const service = createAuthService({
    repository,
    refreshSessionDays: env.AUTH_REFRESH_SESSION_DAYS,
    issueAccessToken(auth) {
      // JWT contains identity only. Roles and permissions are intentionally
      // loaded from PostgreSQL on every protected request so stale tokens
      // cannot preserve removed Admin privileges.
      return app.jwt.sign({ sub: auth.id });
    },
  });
  const controller = createAuthController({
    service,
    env,
    onVerificationRequested: options.onVerificationRequested,
    onPasswordResetRequested: options.onPasswordResetRequested,
  });

  app.post('/register', {
    schema: authSchemas.register,
    config: { rateLimit: STRICT_AUTH_RATE_LIMIT },
    handler: controller.register,
  });

  app.post('/verify-email', {
    schema: authSchemas.verifyEmail,
    config: { rateLimit: STRICT_AUTH_RATE_LIMIT },
    handler: controller.verifyEmail,
  });

  app.post('/login', {
    schema: authSchemas.login,
    config: { rateLimit: STRICT_AUTH_RATE_LIMIT },
    handler: controller.login,
  });

  app.post('/refresh', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: controller.refresh,
  });

  app.post('/logout', controller.logout);

  app.post('/forgot-password', {
    schema: authSchemas.forgotPassword,
    config: { rateLimit: PASSWORD_RESET_RATE_LIMIT },
    handler: controller.forgotPassword,
  });

  app.post('/reset-password', {
    schema: authSchemas.resetPassword,
    config: { rateLimit: PASSWORD_RESET_RATE_LIMIT },
    handler: controller.resetPassword,
  });
}
