import { AUTH_COOKIES } from '../auth/auth.contracts.js';

function clearSessionCookies(reply, env) {
  const options = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
  reply.clearCookie(AUTH_COOKIES.ACCESS, options);
  reply.clearCookie(AUTH_COOKIES.REFRESH, options);
}

export function createUsersController({ service, env }) {
  return {
    async deleteCurrentAccount(request, reply) {
      await service.deleteCurrentAccount({
        userId: request.auth.id,
        password: request.body.password,
      });
      clearSessionCookies(reply, env);
      reply.header('Cache-Control', 'private, no-store');
      return reply.status(204).send();
    },
  };
}
