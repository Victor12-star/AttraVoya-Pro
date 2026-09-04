import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().trim().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  WEB_URL: z.string().url(),
  ADMIN_URL: z.string().url(),
  API_URL: z.string().url(),
  DATABASE_URL: z.string().trim().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  DATA_ENCRYPTION_KEY: z.string().min(32),
  JWT_ACCESS_TTL: z
    .string()
    .trim()
    .regex(/^\d+[smhd]$/, 'Use a duration such as 15m, 1h, or 1d')
    .default('15m'),
  AUTH_REFRESH_SESSION_DAYS: z.coerce.number().int().min(1).max(180).default(30),
  JWT_ISSUER: z.string().trim().min(1).default('attravoya-pro-api'),
  JWT_AUDIENCE: z.string().trim().min(1).default('attravoya-pro'),
  COOKIE_DOMAIN: z.string().trim().min(1).optional(),

  // Provider selection is environment-driven so development providers can be
  // replaced for public/commercial launch without rewriting application code.
  MAPS_PROVIDER: z.string().trim().min(1).default('geoapify'),
  PLACES_PROVIDER: z.string().trim().min(1).default('geoapify'),
  ACCOMMODATION_PROVIDER: z.string().trim().min(1).default('geoapify'),
  WEATHER_PROVIDER: z.string().trim().min(1).default('openmeteo'),
  CURRENCY_PROVIDER: z.string().trim().min(1).default('frankfurter'),
  TRANSLATION_PROVIDER: z.string().trim().min(1).default('libretranslate'),
  EVENTS_PROVIDER: z.string().trim().min(1).default('ticketmaster'),
  NEWS_PROVIDER: z.string().trim().min(1).default('newsdata'),
  IMAGE_PROVIDER: z.string().trim().min(1).default('pexels'),
  EMAIL_PROVIDER: z.string().trim().min(1).default('resend'),
  FLIGHT_PROVIDER: z.string().trim().min(1).default('none'),

  GEOAPIFY_API_KEY: z.string().trim().optional(),
  TICKETMASTER_API_KEY: z.string().trim().optional(),
  NEWSDATA_API_KEY: z.string().trim().optional(),
  PEXELS_API_KEY: z.string().trim().optional(),
  RESEND_API_KEY: z.string().trim().optional(),
  EMAIL_FROM: z.string().trim().optional(),
  LIBRETRANSLATE_URL: z.string().url().default('http://localhost:5001'),

  PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  PROVIDER_RETRY_MAX: z.coerce.number().int().min(0).max(5).default(2),
  WEATHER_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(600),
  CURRENCY_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(604800).default(21600),
  PLACES_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(3600),
  EVENTS_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(3600),
  NEWS_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(1800),
});

function formatEnvironmentErrors(error) {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('\n');
}

/**
 * Validate security-sensitive configuration once during process startup.
 * Failing early is safer than allowing the API to boot with missing secrets
 * and discovering the problem only when an authenticated request arrives.
 */
export function loadEnvironment(source = process.env) {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid AttraVoya Pro server environment:\n${formatEnvironmentErrors(result.error)}`,
    );
  }

  return Object.freeze(result.data);
}

export const env = loadEnvironment();
