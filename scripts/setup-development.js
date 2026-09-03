#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const examplePath = path.join(root, '.env.example');
const envPath = path.join(root, '.env');

function parseEnv(text) {
  const result = new Map();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = rawLine.indexOf('=');
    if (separator === -1) continue;

    const key = rawLine.slice(0, separator).trim();
    const value = rawLine.slice(separator + 1).trim();
    result.set(key, value);
  }

  return result;
}

function replaceEnvValue(text, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const linePattern = new RegExp(`^${escapedKey}=.*$`, 'm');

  if (!linePattern.test(text)) {
    return `${text.trimEnd()}\n${key}=${value}\n`;
  }

  return text.replace(linePattern, `${key}=${value}`);
}

function randomHex(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

function randomBase64(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

if (!fs.existsSync(examplePath)) {
  console.error('Cannot set up development: .env.example is missing.');
  process.exit(1);
}

let envText;
if (fs.existsSync(envPath)) {
  envText = fs.readFileSync(envPath, 'utf8');
  console.log('Using existing .env. Existing values will not be overwritten.');
} else {
  envText = fs.readFileSync(examplePath, 'utf8');
  console.log('Creating .env from .env.example.');
}

let values = parseEnv(envText);

const ensureValue = (key, generator) => {
  const current = values.get(key)?.trim();
  if (current) return;

  const generated = generator();
  envText = replaceEnvValue(envText, key, generated);
  values.set(key, generated);
};

// Local-only secrets are generated instead of shipping shared credentials in the repository.
// Production environments must use independently managed secrets from their hosting platform.
ensureValue('POSTGRES_PASSWORD', () => randomHex(24));
ensureValue('JWT_ACCESS_SECRET', () => randomHex());
ensureValue('COOKIE_SECRET', () => randomHex());
ensureValue('DATA_ENCRYPTION_KEY', () => randomBase64(32));

const databaseName = values.get('POSTGRES_DB') || 'attravoya';
const databaseUser = values.get('POSTGRES_USER') || 'attravoya';
const databasePassword = values.get('POSTGRES_PASSWORD');
const encodedPassword = encodeURIComponent(databasePassword);
const connectionString = `postgresql://${databaseUser}:${encodedPassword}@localhost:5432/${databaseName}?schema=public`;

if (!values.get('DATABASE_URL')?.trim()) {
  envText = replaceEnvValue(envText, 'DATABASE_URL', connectionString);
  values.set('DATABASE_URL', connectionString);
}

fs.writeFileSync(envPath, envText, { encoding: 'utf8', mode: 0o600 });

console.log('Development environment file is ready.');
console.log('External provider API keys were intentionally left untouched.');
console.log('Next: run `node scripts/check-environment.js`, then `docker compose up -d`.');
