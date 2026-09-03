import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'prisma/config';

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

// Use the same root environment as the API so developers do not have to copy
// database credentials into multiple .env files. A package-local .env may still
// override values for isolated migration/testing work when explicitly created.
loadDotenv({ path: path.resolve(packageDirectory, '../../.env') });
loadDotenv({ path: path.resolve(packageDirectory, '.env'), override: true });

const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL?.trim() || undefined;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    // Keeping undefined values non-fatal lets `prisma generate` run without
    // embedding a database credential in build or container layers. Commands
    // that access PostgreSQL still fail safely until DATABASE_URL is supplied.
    url: databaseUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
