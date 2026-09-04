import { randomUUID } from 'node:crypto';

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import { API_PREFIX, DEFAULT_RATE_LIMIT } from './config/constants.js';
import { env } from './config/env.js';
import { registerErrorHandler } from './errors/error-handler.js';
import { registerRequestContext } from './hooks/request-context.js';
import { createAuthenticateHook } from './hooks/authenticate.js';
import { createAuthorizeHook } from './hooks/authorize.js';
import { createLoggerOptions } from './logging/logger.js';
import { authRepository } from './modules/auth/auth.repository.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { countriesRoutes } from './modules/countries/countries.routes.js';
import { languagesRoutes } from './modules/languages/languages.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { weatherRoutes } from './modules/weather/weather.routes.js';
import { currencyRoutes } from './modules/currency/currency.routes.js';
import { placesRoutes } from './modules/places/places.routes.js';
import { translationRoutes } from './modules/translation/translation.routes.js';
import { accommodationRoutes } from './modules/accommodation/accommodation.routes.js';
import { eventsRoutes } from './modules/events/events.routes.js';
import { newsRoutes } from './modules/news/news.routes.js';

export async function buildApp(options = {}) {
  const app = Fastify({
    logger: options.logger ?? createLoggerOptions(),
    genReqId: () => randomUUID(),
    trustProxy: env.NODE_ENV === 'production',
    disableRequestLogging: false,
  });

  // Standardize all request validation on shared Zod schemas. Keeping one
  // validator across API modules avoids subtly different validation rules at
  // route, service, and client boundaries.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);
  await registerRequestContext(app);

  // Keep trusted database-backed identity separate from request.user, which is
  // the decoded JWT payload populated by @fastify/jwt.
  app.decorateRequest('auth', null);

  await app.register(helmet, {
    // The API does not need to render arbitrary third-party HTML. Keeping
    // Helmet defaults provides a strict baseline before the web-specific CSP
    // is added to the Next.js applications in the design/security phase.
    global: true,
  });

  await app.register(cors, {
    origin: [env.WEB_URL, env.ADMIN_URL],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
  });

  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: {
      cookieName: 'attravoya_access',
      signed: false,
    },
    sign: {
      expiresIn: env.JWT_ACCESS_TTL,
      iss: env.JWT_ISSUER,
      aud: env.JWT_AUDIENCE,
    },
    verify: {
      allowedIss: env.JWT_ISSUER,
      allowedAud: env.JWT_AUDIENCE,
    },
  });

  const authenticationRepository = options.authRepository ?? authRepository;
  app.decorate('authenticate', createAuthenticateHook({ repository: authenticationRepository }));
  app.decorate('authorize', createAuthorizeHook);

  await app.register(rateLimit, {
    global: true,
    ...DEFAULT_RATE_LIMIT,
    errorResponseBuilder(request) {
      return {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again shortly.',
          requestId: request.id,
        },
      };
    },
  });

  await app.register(authRoutes, {
    prefix: `${API_PREFIX}/auth`,
    repository: options.authRepository,
    onVerificationRequested: options.onVerificationRequested,
    onPasswordResetRequested: options.onPasswordResetRequested,
  });

  await app.register(healthRoutes, {
    prefix: `${API_PREFIX}/health`,
    repository: options.healthRepository,
  });

  await app.register(countriesRoutes, {
    prefix: `${API_PREFIX}/countries`,
    repository: options.countriesRepository,
  });

  await app.register(languagesRoutes, {
    prefix: `${API_PREFIX}/languages`,
    repository: options.languagesRepository,
  });

  await app.register(weatherRoutes, {
    prefix: `${API_PREFIX}/weather`,
    provider: options.weatherProvider,
  });

  await app.register(currencyRoutes, {
    prefix: `${API_PREFIX}/currency`,
    provider: options.currencyProvider,
  });

  await app.register(placesRoutes, {
    prefix: `${API_PREFIX}/places`,
    provider: options.placesProvider,
  });

  await app.register(translationRoutes, {
    prefix: `${API_PREFIX}/translation`,
    provider: options.translationProvider,
  });

  await app.register(accommodationRoutes, {
    prefix: `${API_PREFIX}/accommodation`,
    provider: options.accommodationProvider,
  });

  await app.register(eventsRoutes, {
    prefix: `${API_PREFIX}/events`,
    provider: options.eventsProvider,
  });

  await app.register(newsRoutes, {
    prefix: `${API_PREFIX}/news`,
    provider: options.newsProvider,
  });

  return app;
}
