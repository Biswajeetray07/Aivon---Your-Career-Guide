import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Wipes all critical tables in the database to ensure test isolation.
 * WARNING: This should ONLY be run in a test environment.
 */
export async function clearDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Attempting to clear production database');
  }

  // Use a transaction to ensure all tables are wiped or none are
  await prisma.$transaction([
    prisma.submission.deleteMany({}),
    prisma.problem.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.account.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);
  
  console.log('🧪 Test Database Cleared');
}
