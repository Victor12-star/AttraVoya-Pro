/**
 * Execute only from an explicitly authorized operator environment with a
 * secure DATABASE_URL. It never accepts a password and never creates a user.
 */
import { prisma } from '../src/client.js';
import { provisionFirstOwner } from '../src/first-owner-provisioning.js';

async function main() {
  if (
    process.argv.length !== 3 ||
    process.argv[2] !== '--confirm-first-owner' ||
    process.env.FIRST_OWNER_APPROVED !== 'yes'
  ) {
    throw new Error(
      'Explicit approval required: FIRST_OWNER_APPROVED=yes and --confirm-first-owner.',
    );
  }
  const email = process.env.FIRST_OWNER_EMAIL;
  await provisionFirstOwner(prisma, email);
  console.info('First owner role assigned to an existing, verified account.');
}

try {
  await main();
} catch (error) {
  // Do not expose email addresses, connection strings, or database traces.
  console.error(error instanceof Error ? error.message : 'First owner setup failed.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
