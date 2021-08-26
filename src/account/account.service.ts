import {Injectable} from '@nestjs/common';

import {PrismaService} from '~/prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(
    where: {id: string} | {alias: string} | {email: string},
  ): Promise<{
    id: string;
    email: string;
    alias: string;
    displayName: string;
  } | null> {
    return this.prisma.user.findUnique({
      where,
      select: {id: true, email: true, alias: true, displayName: true},
    });
  }
}
