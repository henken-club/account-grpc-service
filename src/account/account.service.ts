import {Injectable} from '@nestjs/common';

import {PrismaService} from '~/prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUser(
    where: {id: string} | {alias: string},
  ): Promise<{id: string; alias: string; displayName: string} | null> {
    return this.prismaService.user.findUnique({
      where,
      select: {id: true, alias: true, displayName: true},
    });
  }
}
