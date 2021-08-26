import {randomUUID} from 'crypto';

import {Inject, Injectable} from '@nestjs/common';
import {ConfigType} from '@nestjs/config';
import ms from 'ms';

import {AuthConfig} from '../auth.config';

import {PrismaService} from '~/prisma/prisma.service';

export type RegisterTokenPayload = {uid: string};

@Injectable()
export class SignupService {
  constructor(
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
    private readonly prisma: PrismaService,
  ) {}

  formatTimestamp(date: Date): {seconds: number; nanos: number} {
    return {
      seconds: Math.floor(date.getTime() / 1000),
      nanos: 0 + (date.getTime() % 1000) * 1e6,
    };
  }

  /**
   * メールアドレスが既に登録されているユーザと重複しているかを検証する．
   *
   * @param email メールアドレス
   * @returns メールアドレスが重複しているか
   */
  async isEmailDuplicated(email: string): Promise<boolean> {
    return this.prisma.user
      .findUnique({where: {email}, select: {id: true}})
      .then((result) => Boolean(result));
  }

  /**
   * エイリアスが既に登録されているユーザと重複しているかを検証する．
   *
   * @param alias エイリアス
   * @returns エイリアスが重複しているか
   */
  async isAliasDuplicated(alias: string): Promise<boolean> {
    return this.prisma.user
      .findUnique({where: {alias}, select: {id: true}})
      .then((result) => Boolean(result));
  }

  /**
   * 仮ユーザーを生成または更新する
   *
   * @param payload
   * @returns 仮生成されたユーザーの情報
   */
  async upsertTemporaryUser(payload: {
    password: string;
    email: string;
    alias: string;
    displayName?: string;
  }): Promise<{id: string}> {
    const {email, alias, displayName = alias, password} = payload;
    return this.prisma.temporaryUser.upsert({
      where: {email},
      create: {email, alias, password, displayName},
      update: {alias, password, displayName},
      select: {id: true},
    });
  }

  async generateVerificationCode(): Promise<string> {
    return randomUUID();
  }

  async generateRegisterToken(): Promise<string> {
    return randomUUID();
  }

  async calculateExpiredAt(): Promise<Date> {
    return new Date(Date.now() + ms(this.config.registrationExpiresIn));
  }

  async createRegisterPair(userId: string): Promise<{
    code: string;
    token: string;
    expiredAt: Date;
  }> {
    const code = await this.generateVerificationCode();
    const token = await this.generateRegisterToken();
    const expiredAt = await this.calculateExpiredAt();
    return this.prisma.registration.create({
      data: {
        code,
        token,
        expiredAt,
        user: {connect: {id: userId}},
      },
      select: {token: true, code: true, expiredAt: true},
    });
  }

  async updateRegisterPair(token: string): Promise<{
    code: string;
    token: string;
    expiredAt: Date;
  }> {
    const newCode = await this.generateVerificationCode();
    return this.prisma.registration.update({
      where: {token},
      data: {code: newCode},
      select: {token: true, code: true, expiredAt: true},
    });
  }

  // User registration
  /**
   * idとtokenのペアが正しいかどうかを検証する．
   *
   * @param code
   * @param token
   * @returns idとtokenのペアが正しいか
   */
  async verifyRegisterPair(token: string, code: string): Promise<boolean> {
    return this.prisma.registration
      .findUnique({
        where: {token},
        select: {code: true, expiredAt: true},
      })
      .then((result) => result?.code === code);
  }

  async getUserFromRegisterToken(registerToken: string): Promise<{id: string}> {
    return this.prisma.registration.findUnique({
      where: {token: registerToken},
      rejectOnNotFound: true,
      select: {id: true},
    });
  }

  async registerUser(registerToken: string): Promise<{id: string}> {
    return this.prisma.registration
      .findUnique({
        where: {token: registerToken},
        select: {user: true},
        rejectOnNotFound: true,
      })
      .catch(() => {
        throw new Error(
          `Registration with token "${registerToken}" was not found.`,
        );
      })
      .then(({user: {id, email, alias, password, displayName}}) =>
        this.prisma.user.upsert({
          where: {id},
          create: {id, email, alias, password, displayName},
          update: {},
          select: {id: true},
        }),
      );
  }

  async requestSendEmail(token: string): Promise<void> {
    const {code, user} = await this.prisma.registration.findUnique({
      where: {token},
      select: {
        code: true,
        expiredAt: true,
        user: {select: {email: true, alias: true, displayName: true}},
      },
      rejectOnNotFound: true,
    });
  }
}
