#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = rawLine.indexOf('=');
    if (separator === -1) continue;

    const key = rawLine.slice(0, separator).trim();
    let value = rawLine.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const RESERVED_EXACT_HOSTNAMES = new Set(['example.com', 'example.net', 'example.org']);
const RESERVED_HOST_SUFFIXES = ['.example', '.invalid', '.test'];

function isReservedHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    RESERVED_EXACT_HOSTNAMES.has(normalized) ||
    RESERVED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

function isValidProductionOrigin(value) {
  if (!value?.trim()) return false;

  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !LOOPBACK_HOSTS.has(url.hostname.toLowerCase()) &&
      !isReservedHostname(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.pathname === '/' || url.pathname === '')
    );
  } catch {
    return false;
  }
}

function isValidPublicEmail(value) {
  const normalized = value?.trim();
  if (
    typeof normalized !== 'string' ||
    normalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return false;
  }

  const domain = normalized.slice(normalized.lastIndexOf('@') + 1);
  return !isReservedHostname(domain);
}

function isPositiveIntegerString(value) {
  const normalized = value?.trim();
  return typeof normalized === 'string' && /^[1-9]\d*$/.test(normalized);
}

function parseReplicaCount(value) {
  const normalized = value?.trim() || '1';
  if (!/^\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : null;
}

function isValidMetricsInstanceId(value) {
  const normalized = value?.trim();
  return typeof normalized === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(normalized);
}

/** @type {Record<string, string | undefined>} */
const env = {
  ...parseEnvFile(path.join(process.cwd(), '.env')),
  ...process.env,
};

const errors = [];
const warnings = [];

const requireValue = (key, minimumLength = 1) => {
  const value = env[key]?.trim();
  if (!value || value.length < minimumLength) {
    errors.push(
      `${key} is required${minimumLength > 1 ? ` and must be at least ${minimumLength} characters` : ''}.`,
    );
  }
};

requireValue('DATABASE_URL');
requireValue('JWT_ACCESS_SECRET', 32);
requireValue('COOKIE_SECRET', 32);
requireValue('DATA_ENCRYPTION_KEY', 32);

if (env.NODE_ENV?.trim().toLowerCase() === 'production') {
  for (const key of ['WEB_URL', 'ADMIN_URL', 'API_URL']) {
    if (!isValidProductionOrigin(env[key])) {
      errors.push(
        `${key} must be a non-local, non-placeholder HTTPS origin without credentials, path, query, or fragment in production.`,
      );
    }
  }

  const privacyContact =
    env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() || env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  if (!isValidPublicEmail(privacyContact)) {
    errors.push(
      'A valid non-placeholder NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL or NEXT_PUBLIC_SUPPORT_EMAIL is required in production.',
    );
  }

  const replicaCount = parseReplicaCount(env.API_REPLICA_COUNT);
  if (replicaCount === null) {
    errors.push('API_REPLICA_COUNT must be a whole number between 1 and 100 in production.');
  }

  const metricsAggregationMode =
    env.METRICS_AGGREGATION_MODE?.trim().toLowerCase() || 'process_local';
  if (!['process_local', 'external'].includes(metricsAggregationMode)) {
    errors.push(
      "METRICS_AGGREGATION_MODE must be either 'process_local' or 'external' in production.",
    );
  }

  if (replicaCount !== null && replicaCount > 1 && metricsAggregationMode !== 'external') {
    errors.push(
      "METRICS_AGGREGATION_MODE must be 'external' in production when API_REPLICA_COUNT is greater than 1.",
    );
  }

  if (
    metricsAggregationMode === 'external' &&
    !isValidMetricsInstanceId(env.METRICS_INSTANCE_ID)
  ) {
    errors.push(
      'METRICS_INSTANCE_ID must be 1 to 64 letters, numbers, dots, underscores, or dashes, starting with a letter or number, when METRICS_AGGREGATION_MODE=external.',
    );
  }

  const geoapifySelected = [
    'MAPS_PROVIDER',
    'PLACES_PROVIDER',
    'GEOCODING_PROVIDER',
    'ROUTING_PROVIDER',
    'ACCOMMODATION_PROVIDER',
  ].some((key) => env[key]?.trim().toLowerCase() === 'geoapify');

  for (const { selected, credential, label } of [
    { selected: geoapifySelected, credential: 'GEOAPIFY_API_KEY', label: 'Geoapify' },
    {
      selected: env.EVENTS_PROVIDER?.trim().toLowerCase() === 'ticketmaster',
      credential: 'TICKETMASTER_API_KEY',
      label: 'Ticketmaster',
    },
    {
      selected: env.NEWS_PROVIDER?.trim().toLowerCase() === 'newsdata',
      credential: 'NEWSDATA_API_KEY',
      label: 'NewsData',
    },
    {
      selected: env.IMAGE_PROVIDER?.trim().toLowerCase() === 'pexels',
      credential: 'PEXELS_API_KEY',
      label: 'Pexels',
    },
    {
      selected: env.EMAIL_PROVIDER?.trim().toLowerCase() === 'resend',
      credential: 'RESEND_API_KEY',
      label: 'Resend',
    },
  ]) {
    if (selected && !env[credential]?.trim()) {
      errors.push(`${credential} is required in production when ${label} is selected.`);
    }
  }

  if (env.EMAIL_PROVIDER?.trim().toLowerCase() === 'resend' && !env.EMAIL_FROM?.trim()) {
    errors.push('EMAIL_FROM is required in production when Resend is selected.');
  }

  for (const { selected, prefix, label } of [
    { selected: geoapifySelected, prefix: 'GEOAPIFY', label: 'Geoapify' },
    {
      selected: env.EVENTS_PROVIDER?.trim().toLowerCase() === 'ticketmaster',
      prefix: 'TICKETMASTER',
      label: 'Ticketmaster',
    },
    {
      selected: env.NEWS_PROVIDER?.trim().toLowerCase() === 'newsdata',
      prefix: 'NEWSDATA',
      label: 'NewsData',
    },
    {
      selected: env.IMAGE_PROVIDER?.trim().toLowerCase() === 'pexels',
      prefix: 'PEXELS',
      label: 'Pexels',
    },
    {
      selected: env.EMAIL_PROVIDER?.trim().toLowerCase() === 'resend',
      prefix: 'RESEND',
      label: 'Resend',
    },
  ]) {
    if (!selected) continue;

    for (const field of [
      `${prefix}_REQUEST_BUDGET_MAX`,
      `${prefix}_REQUEST_BUDGET_WINDOW_SECONDS`,
    ]) {
      if (!isPositiveIntegerString(env[field])) {
        errors.push(`${field} must be a positive integer in production when ${label} is selected.`);
      }
    }
  }
}

const stripeWebhookEnabled = env.STRIPE_WEBHOOK_ENABLED?.trim().toLowerCase();
if (stripeWebhookEnabled && !['true', 'false'].includes(stripeWebhookEnabled)) {
  errors.push('STRIPE_WEBHOOK_ENABLED must be either true or false.');
}
if (stripeWebhookEnabled === 'true') {
  requireValue('STRIPE_WEBHOOK_SECRET', 16);
}

const revenueCatWebhookEnabled = env.REVENUECAT_WEBHOOK_ENABLED?.trim().toLowerCase();
if (revenueCatWebhookEnabled && !['true', 'false'].includes(revenueCatWebhookEnabled)) {
  errors.push('REVENUECAT_WEBHOOK_ENABLED must be either true or false.');
}
if (revenueCatWebhookEnabled === 'true') {
  requireValue('REVENUECAT_WEBHOOK_SIGNING_SECRET', 32);
  requireValue('REVENUECAT_ANDROID_PRO_MONTHLY_PRODUCT_ID', 3);
  requireValue('REVENUECAT_ANDROID_PRO_YEARLY_PRODUCT_ID', 3);
}

const stripePurchaseEnabled = env.STRIPE_PURCHASE_ENABLED?.trim().toLowerCase();
if (stripePurchaseEnabled && !['true', 'false'].includes(stripePurchaseEnabled)) {
  errors.push('STRIPE_PURCHASE_ENABLED must be either true or false.');
}
if (stripePurchaseEnabled === 'true') {
  requireValue('STRIPE_SECRET_KEY', 16);
  requireValue('STRIPE_PRO_MONTHLY_PRICE_ID', 8);
  requireValue('STRIPE_PRO_YEARLY_PRICE_ID', 8);

  const monthlyPrice = env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim();
  const yearlyPrice = env.STRIPE_PRO_YEARLY_PRICE_ID?.trim();
  if (monthlyPrice && !/^price_[A-Za-z0-9]+$/.test(monthlyPrice)) {
    errors.push('STRIPE_PRO_MONTHLY_PRICE_ID must be a Stripe Price ID beginning with price_.');
  }
  if (yearlyPrice && !/^price_[A-Za-z0-9]+$/.test(yearlyPrice)) {
    errors.push('STRIPE_PRO_YEARLY_PRICE_ID must be a Stripe Price ID beginning with price_.');
  }
  if (monthlyPrice && yearlyPrice && monthlyPrice === yearlyPrice) {
    errors.push('STRIPE_PRO_MONTHLY_PRICE_ID and STRIPE_PRO_YEARLY_PRICE_ID must be different.');
  }

  if (stripeWebhookEnabled !== 'true') {
    errors.push(
      'STRIPE_WEBHOOK_ENABLED must be true before STRIPE_PURCHASE_ENABLED can be enabled.',
    );
  }
  requireValue('STRIPE_WEBHOOK_SECRET', 16);
  requireValue('WEB_URL');

  const webUrlValue = env.WEB_URL?.trim();
  if (webUrlValue) {
    try {
      const webUrl = new URL(webUrlValue);
      if (!['http:', 'https:'].includes(webUrl.protocol) || webUrl.username || webUrl.password) {
        errors.push('WEB_URL must be an HTTP(S) origin without embedded credentials.');
      }
      if (env.NODE_ENV?.trim() === 'production' && webUrl.protocol !== 'https:') {
        errors.push(
          'WEB_URL must use HTTPS when Stripe purchase creation is enabled in production.',
        );
      }
    } catch {
      errors.push('WEB_URL must be a valid URL for Stripe checkout returns.');
    }
  }
}

for (const [providerKey, credentialKey] of [
  ['MAPS_PROVIDER', 'GEOAPIFY_API_KEY'],
  ['PLACES_PROVIDER', 'GEOAPIFY_API_KEY'],
  ['GEOCODING_PROVIDER', 'GEOAPIFY_API_KEY'],
  ['ROUTING_PROVIDER', 'GEOAPIFY_API_KEY'],
  ['EVENTS_PROVIDER', 'TICKETMASTER_API_KEY'],
  ['NEWS_PROVIDER', 'NEWSDATA_API_KEY'],
  ['IMAGE_PROVIDER', 'PEXELS_API_KEY'],
  ['EMAIL_PROVIDER', 'RESEND_API_KEY'],
]) {
  const provider = env[providerKey]?.trim();
  if (provider && provider !== 'none' && !env[credentialKey]?.trim()) {
    warnings.push(`${providerKey}=${provider}, but ${credentialKey} is not configured yet.`);
  }
}

if (errors.length > 0) {
  console.error('Environment validation failed:\n');
  for (const error of errors) console.error(`  [FAIL] ${error}`);
  process.exit(1);
}

console.log('Core environment validation passed.');

if (warnings.length > 0) {
  console.log('\nProvider setup warnings (expected until free API accounts are created):');
  for (const warning of warnings) console.log(`  [WARN] ${warning}`);
}
