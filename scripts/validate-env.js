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

  const geoapifySelected = [
    'MAPS_PROVIDER',
    'PLACES_PROVIDER',
    'GEOCODING_PROVIDER',
    'ROUTING_PROVIDER',
    'ACCOMMODATION_PROVIDER',
  ].some((key) => env[key]?.trim().toLowerCase() === 'geoapify');

  for (const [selected, credential, label] of [
    [geoapifySelected, 'GEOAPIFY_API_KEY', 'Geoapify'],
    [env.EVENTS_PROVIDER?.trim().toLowerCase() === 'ticketmaster', 'TICKETMASTER_API_KEY', 'Ticketmaster'],
    [env.NEWS_PROVIDER?.trim().toLowerCase() === 'newsdata', 'NEWSDATA_API_KEY', 'NewsData'],
    [env.IMAGE_PROVIDER?.trim().toLowerCase() === 'pexels', 'PEXELS_API_KEY', 'Pexels'],
    [env.EMAIL_PROVIDER?.trim().toLowerCase() === 'resend', 'RESEND_API_KEY', 'Resend'],
  ]) {
    if (selected && !env[credential]?.trim()) {
      errors.push(`${credential} is required in production when ${label} is selected.`);
    }
  }

  if (env.EMAIL_PROVIDER?.trim().toLowerCase() === 'resend' && !env.EMAIL_FROM?.trim()) {
    errors.push('EMAIL_FROM is required in production when Resend is selected.');
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
