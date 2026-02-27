import prisma from '../src/services/prisma.ts';

async function main() {
  console.log('Starting production wipe...');

  // Delete all ArenaMatches (depends on Users, Problems)
  const deletedArena = await prisma.arenaMatch.deleteMany({});
  console.log(`Deleted ${deletedArena.count} ArenaMatches`);

  // Delete all Submissions (depends on Users, Problems)
  const deletedSub = await prisma.submission.deleteMany({});
  console.log(`Deleted ${deletedSub.count} Submissions`);

  // Delete all Users
  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`Deleted ${deletedUsers.count} Users`);

  console.log('Production wipe complete. Keep Problems and TestCases intact.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
