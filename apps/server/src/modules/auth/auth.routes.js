import { env } from '../../config/env.js';
import { createEmailProvider } from '../../integrations/email/email-provider.factory.js';
import { authRepository } from './auth.repository.js';
import { authSchemas } from './auth.schema.js';
import { createAuthService } from './auth.service.js';
import { createAuthController } from './auth.controller.js';

const STRICT_AUTH_RATE_LIMIT = Object.freeze({ max: 10, timeWindow: '1 minute' });
const PASSWORD_RESET_RATE_LIMIT = Object.freeze({ max: 5, timeWindow: '15 minutes' });
const VERIFICATION_RESEND_RATE_LIMIT = Object.freeze({ max: 5, timeWindow: '15 minutes' });

function resolveConfiguredEmailProvider(options) {
  if (options.emailProvider) return options.emailProvider;

  // Development can boot before a free Resend account is configured. In
  // production env validation requires these values, so real users are not
  // left with an account that cannot receive verification/reset mail.
  if (
    env.EMAIL_PROVIDER === 'resend' &&
    env.RESEND_API_KEY?.trim() &&
    env.EMAIL_FROM?.trim()
  ) {
    return createEmailProvider();
  }

  return null;
}

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

  const emailProvider = resolveConfiguredEmailProvider(options);
  const onVerificationRequested =
    options.onVerificationRequested ??
    (emailProvider
      ? ({ email, token }) => emailProvider.sendVerificationEmail({ to: email, token })
      : undefined);
  const onPasswordResetRequested =
    options.onPasswordResetRequested ??
    (emailProvider
      ? ({ email, token }) => emailProvider.sendPasswordResetEmail({ to: email, token })
      : undefined);

  const controller = createAuthController({
    service,
    env,
    onVerificationRequested,
    onPasswordResetRequested,
  });

  app.post('/register', {
    schema: authSchemas.register,
    config: { rateLimit: STRICT_AUTH_RATE_LIMIT },
    handler: controller.register,
  });

  app.post('/resend-verification', {
    schema: authSchemas.forgotPassword,
    config: { rateLimit: VERIFICATION_RESEND_RATE_LIMIT },
    handler: controller.resendVerification,
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
