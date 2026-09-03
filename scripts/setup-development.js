import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const root = path.resolve(dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

function parseEnv(text) {
  const values = new Map();

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    values.set(line.slice(0, separator).trim(), line.slice(separator + 1));
  }

  return values;
}

function replaceEnvValue(text, key, value) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`^${escaped}=.*$`, 'm');

  if (expression.test(text)) {
    return text.replace(expression, `${key}=${value}`);
  }

  return `${text.trimEnd()}\n${key}=${value}\n`;
}

function randomSecret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
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

const values = parseEnv(envText);

const ensureValue = (key, generator) => {
  const current = values.get(key)?.trim();
  if (current) return;

  const generated = generator();
  envText = replaceEnvValue(envText, key, generated);
  values.set(key, generated);
};

// Local-only secrets are generated instead of shipping shared credentials in the repository.
// Production environments must use independently managed secrets from their hosting platform.
ensureValue('POSTGRES_PASSWORD', () => randomSecret(24));
ensureValue('JWT_ACCESS_SECRET', () => randomSecret(48));
ensureValue('COOKIE_SECRET', () => randomSecret(48));
ensureValue('DATA_ENCRYPTION_KEY', () => randomHex(32));

fs.writeFileSync(envPath, envText, { encoding: 'utf8', mode: 0o600 });

console.log('Local development environment is ready.');
console.log('Generated values stay in .env, which must remain outside Git.');
console.log('Run `node scripts/check-environment.js` next to verify local prerequisites.');
