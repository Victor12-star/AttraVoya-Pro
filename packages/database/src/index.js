// Public entry point for @attravoya/database.
// Runtime consumers receive the shared Prisma client plus narrow lifecycle and
// aggregate pool-observability helpers without direct access to pool secrets.

export { closeDatabase, getDatabasePoolMetrics, prisma, default } from './client.js';
