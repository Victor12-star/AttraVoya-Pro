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
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}

console.log('Core environment validation passed.');

if (warnings.length > 0) {
  console.log('\nProvider setup warnings (expected until free API accounts are created):');
  for (const warning of warnings) console.log(`  ! ${warning}`);
}
