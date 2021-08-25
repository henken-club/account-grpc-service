import {Injectable} from '@nestjs/common';

import {PasswordService} from '../password.service';

import {PrismaService} from '~/prisma/prisma.service';

@Injectable()
export class SigninService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async findUser(
    where: {email: string} | {alias: string},
  ): Promise<{id: string} | null> {
    return this.prisma.user.findUnique({where, select: {id: true}});
  }

  /**
   * ユーザIDに紐づくパスワードが入力と正しいか検証する．
   *
   * @param userId ユーザーID
   * @param password 入力されたパスワード
   * @returns ユーザIDに紐づくパスワードが入力と合致していたら`true`，それ以外の場合は`false`
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    return this.prisma.user
      .findUnique({
        where: {id: userId},
        select: {password: true},
        rejectOnNotFound: true,
      })
      .then(({password: encrypted}) =>
        this.password.comparePassword(password, encrypted),
      )
      .catch(() => false);
  }
}
