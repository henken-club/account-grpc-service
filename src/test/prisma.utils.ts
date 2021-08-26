import {PrismaClient} from '@prisma/client';

export const cleanPrisma = async (): Promise<void> => {
  const prisma = new PrismaClient();
  await prisma.$transaction([
    prisma.registration.deleteMany(),
    prisma.temporaryUser.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await prisma.$disconnect();
};
