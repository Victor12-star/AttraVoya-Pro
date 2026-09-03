// Public entry point for @attravoya/database.
// Re-exports the shared Prisma client so the API server can
// `import { prisma } from '@attravoya/database'`.

export { prisma, default } from './client.js';
