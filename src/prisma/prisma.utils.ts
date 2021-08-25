import {Prisma, PrismaClient} from '@prisma/client';

export const cleanPrisma = async (): Promise<void> => {
  const prisma = new PrismaClient();

  const transactions = Prisma.dmmf.datamodel.models
    .map((model) => model.name)
    .map((modelName) =>
      (prisma as any)[
        modelName.charAt(0).toLowerCase() + modelName.slice(1)
      ].deleteMany(),
    );

  await prisma.$transaction(transactions);
  await prisma.$disconnect();
};
