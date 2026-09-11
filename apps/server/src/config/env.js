import { z } from 'zod';

const optionalPositiveInteger = (maximum) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.coerce.number().int().min(1).max(maximum).optional(),
  );

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().trim().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  SHUTDOWN_GRACE_MS: z.coerce.number().int().min(1000).max(120000).default(25000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  WEB_URL: z.string().url(),
  ADMIN_URL: z.string().url(),
  API_URL: z.string().url(),
  DATABASE_URL: z.string().trim().min(1),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(5000),
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

  GEOAPIFY_REQUEST_BUDGET_MAX: optionalPositiveInteger(100_000_000),
  GEOAPIFY_REQUEST_BUDGET_WINDOW_SECONDS: optionalPositiveInteger(2_592_000),
  TICKETMASTER_REQUEST_BUDGET_MAX: optionalPositiveInteger(100_000_000),
  TICKETMASTER_REQUEST_BUDGET_WINDOW_SECONDS: optionalPositiveInteger(2_592_000),
  NEWSDATA_REQUEST_BUDGET_MAX: optionalPositiveInteger(100_000_000),
  NEWSDATA_REQUEST_BUDGET_WINDOW_SECONDS: optionalPositiveInteger(2_592_000),
  PEXELS_REQUEST_BUDGET_MAX: optionalPositiveInteger(100_000_000),
  PEXELS_REQUEST_BUDGET_WINDOW_SECONDS: optionalPositiveInteger(2_592_000),
  RESEND_REQUEST_BUDGET_MAX: optionalPositiveInteger(100_000_000),
  RESEND_REQUEST_BUDGET_WINDOW_SECONDS: optionalPositiveInteger(2_592_000),

  PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  PROVIDER_RETRY_MAX: z.coerce.number().int().min(0).max(5).default(2),
  WEATHER_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(600),
  CURRENCY_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(604800).default(21600),
  PLACES_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(3600),
  EVENTS_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(3600),
  NEWS_CACHE_TTL_SECONDS: z.coerce.number().int().min(30).max(86400).default(1800),
  IMAGES_CACHE_TTL_SECONDS: z.coerce.number().int().min(300).max(604800).default(86400),
});

const REQUEST_BUDGET_CONFIGS = [
  { provider: 'geoapify', prefix: 'GEOAPIFY' },
  { provider: 'ticketmaster', prefix: 'TICKETMASTER' },
  { provider: 'newsdata', prefix: 'NEWSDATA' },
  { provider: 'pexels', prefix: 'PEXELS' },
  { provider: 'resend', prefix: 'RESEND' },
];

function formatEnvironmentErrors(error) {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('\n');
}

function budgetFields(prefix) {
  return {
    maxField: `${prefix}_REQUEST_BUDGET_MAX`,
    windowField: `${prefix}_REQUEST_BUDGET_WINDOW_SECONDS`,
  };
}

function validateProviderBudgetPairs(environment) {
  const incomplete = [];

  for (const { prefix } of REQUEST_BUDGET_CONFIGS) {
    const { maxField, windowField } = budgetFields(prefix);
    const hasMax = environment[maxField] !== undefined;
    const hasWindow = environment[windowField] !== undefined;
    if (hasMax !== hasWindow) incomplete.push(`${maxField} and ${windowField}`);
  }

  if (incomplete.length) {
    throw new Error(
      `Invalid AttraVoya Pro server environment:\n${incomplete.join(', ')}: configure both request-budget values together.`,
    );
  }
}

function enabledCredentialedProviders(environment) {
  const enabled = new Set();

  if (
    environment.GEOAPIFY_API_KEY?.trim() &&
    [environment.MAPS_PROVIDER, environment.PLACES_PROVIDER, environment.ACCOMMODATION_PROVIDER]
      .map((value) => value.toLowerCase())
      .includes('geoapify')
  ) {
    enabled.add('geoapify');
  }
  if (environment.TICKETMASTER_API_KEY?.trim() && environment.EVENTS_PROVIDER === 'ticketmaster') {
    enabled.add('ticketmaster');
  }
  if (environment.NEWSDATA_API_KEY?.trim() && environment.NEWS_PROVIDER === 'newsdata') {
    enabled.add('newsdata');
  }
  if (environment.PEXELS_API_KEY?.trim() && environment.IMAGE_PROVIDER === 'pexels') {
    enabled.add('pexels');
  }
  if (environment.RESEND_API_KEY?.trim() && environment.EMAIL_PROVIDER === 'resend') {
    enabled.add('resend');
  }

  return enabled;
}

function validateProductionProviderBudgets(environment) {
  if (environment.NODE_ENV !== 'production') return;

  const enabled = enabledCredentialedProviders(environment);
  const missing = [];

  for (const { provider, prefix } of REQUEST_BUDGET_CONFIGS) {
    if (!enabled.has(provider)) continue;
    const { maxField, windowField } = budgetFields(prefix);
    if (environment[maxField] === undefined || environment[windowField] === undefined) {
      missing.push(`${maxField} and ${windowField}`);
    }
  }

  if (missing.length) {
    throw new Error(
      `Invalid AttraVoya Pro server environment:\n${missing.join(', ')}: required in production when the corresponding credentialed provider is enabled.`,
    );
  }
}

function validateProductionEmailConfiguration(environment) {
  if (environment.NODE_ENV !== 'production') return;

  if (environment.EMAIL_PROVIDER !== 'resend') {
    throw new Error(
      "Invalid AttraVoya Pro server environment:\nEMAIL_PROVIDER: production currently requires 'resend' for account verification and password reset.",
    );
  }

  const missing = [
    !environment.RESEND_API_KEY?.trim() ? 'RESEND_API_KEY' : null,
    !environment.EMAIL_FROM?.trim() ? 'EMAIL_FROM' : null,
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Invalid AttraVoya Pro server environment:\n${missing.join(', ')}: required in production for transactional authentication email.`,
    );
  }
}

export function providerRequestBudgetPoliciesFromEnvironment(environment) {
  const configured = {};

  for (const { provider, prefix } of REQUEST_BUDGET_CONFIGS) {
    const { maxField, windowField } = budgetFields(prefix);
    const maxRequests = environment[maxField];
    const windowSeconds = environment[windowField];
    if (maxRequests === undefined || windowSeconds === undefined) continue;

    configured[provider] = {
      maxRequests,
      windowMs: windowSeconds * 1000,
    };
  }

  return configured;
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

  validateProviderBudgetPairs(result.data);
  validateProductionEmailConfiguration(result.data);
  validateProductionProviderBudgets(result.data);
  return Object.freeze(result.data);
}

export const env = loadEnvironment();
