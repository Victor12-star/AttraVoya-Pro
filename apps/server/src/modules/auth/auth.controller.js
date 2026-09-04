import { AUTH_COOKIES } from './auth.contracts.js';

function cookieBaseOptions(env) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

function durationToSeconds(value) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 15 * 60;
  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * multipliers[match[2]];
}

function setSessionCookies(reply, session, env) {
  const base = cookieBaseOptions(env);

  // The browser can use the short-lived access cookie for same-site web
  // requests, while API/mobile clients may use the returned access token as a
  // Bearer token. Refresh credentials are HttpOnly and never exposed to JS.
  reply.setCookie(AUTH_COOKIES.ACCESS, session.accessToken, {
    ...base,
    maxAge: durationToSeconds(env.JWT_ACCESS_TTL),
  });
  reply.setCookie(AUTH_COOKIES.REFRESH, session.refreshToken, {
    ...base,
    maxAge: Math.max(0, Math.floor((session.refreshExpiresAt.getTime() - Date.now()) / 1000)),
  });
}

function clearSessionCookies(reply, env) {
  const options = cookieBaseOptions(env);
  reply.clearCookie(AUTH_COOKIES.ACCESS, options);
  reply.clearCookie(AUTH_COOKIES.REFRESH, options);
}

export function createAuthController({
  service,
  env,
  onVerificationRequested,
  onPasswordResetRequested,
}) {
  return {
    async register(request, reply) {
      const result = await service.register(request.body);
      let verificationDelivery = onVerificationRequested ? 'sent' : 'not_configured';

      if (onVerificationRequested) {
        try {
          await onVerificationRequested({
            email: result.user.email,
            token: result.verificationToken,
          });
        } catch (error) {
          // Account creation has already committed. Returning a 5xx here would
          // encourage the traveller to retry registration and hit a duplicate
          // account. Report delivery state instead and allow resend-verification.
          verificationDelivery = 'failed';
          request.log.warn(
            { err: error, userId: result.user.id },
            'Verification email delivery failed after account creation',
          );
        }
      }

      return reply.status(201).send({
        user: {
          id: result.user.id,
          email: result.user.email,
          emailVerified: Boolean(result.user.emailVerifiedAt),
        },
        verificationDelivery,
        message:
          verificationDelivery === 'sent'
            ? 'Account created. Please verify your email before signing in.'
            : 'Account created. Request a new verification email before signing in.',
      });
    },

    async resendVerification(request, reply) {
      const result = await service.resendVerification(request.body.email);

      if (result.verificationToken && result.email && onVerificationRequested) {
        try {
          await onVerificationRequested({
            email: result.email,
            token: result.verificationToken,
          });
        } catch (error) {
          // Keep the public response generic. Provider failures are logged
          // without the raw one-time verification token or email address.
          request.log.warn({ err: error }, 'Verification email resend failed');
        }
      }

      return reply.send({
        message:
          'If the account exists and still needs verification, a new verification email will be sent.',
      });
    },

    async verifyEmail(request, reply) {
      await service.verifyEmail(request.body.token);
      return reply.send({ message: 'Email verified successfully. You can now sign in.' });
    },

    async login(request, reply) {
      const session = await service.login({
        ...request.body,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });
      setSessionCookies(reply, session, env);
      return reply.send({ accessToken: session.accessToken, user: session.user });
    },

    async refresh(request, reply) {
      const session = await service.refresh(request.cookies[AUTH_COOKIES.REFRESH]);
      setSessionCookies(reply, session, env);
      return reply.send({ accessToken: session.accessToken, user: session.user });
    },

    async logout(request, reply) {
      await service.logout(request.cookies[AUTH_COOKIES.REFRESH]);
      clearSessionCookies(reply, env);
      return reply.status(204).send();
    },

    async forgotPassword(request, reply) {
      const result = await service.forgotPassword(request.body.email);

      if (result.resetToken && onPasswordResetRequested) {
        try {
          await onPasswordResetRequested({ email: request.body.email, token: result.resetToken });
        } catch (error) {
          // The response remains identical whether the address exists or mail
          // delivery succeeds, preventing account enumeration through errors.
          request.log.warn({ err: error }, 'Password-reset email delivery failed');
        }
      }

      return reply.send({
        message: 'If an account exists for that email, password-reset instructions will be sent.',
      });
    },

    async resetPassword(request, reply) {
      await service.resetPassword(request.body);
      clearSessionCookies(reply, env);
      return reply.send({ message: 'Password updated. Please sign in again.' });
    },
  };
}
