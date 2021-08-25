import {randomUUID} from 'crypto';

import {Inject, Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {ConfigType} from '@nestjs/config';

import {AuthConfig} from '../auth.config';

import {PrismaService} from '~/prisma/prisma.service';

export type RegisterTokenPayload = {uid: string};

@Injectable()
export class SignupService {
  constructor(
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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
  async upsertTemporaryUser({
    password,
    email,
    alias,
    displayName,
  }: {
    password: string;
    email: string;
    alias: string;
    displayName: string;
  }): Promise<{id: string}> {
    return this.prisma.temporaryUser.upsert({
      where: {email},
      create: {email, alias, password, displayName},
      update: {alias, password, displayName},
      select: {id: true},
    });
  }

  async generateVerifyCode(): Promise<string> {
    return randomUUID();
  }

  async generateRegisterToken(userId: string): Promise<string> {
    const payload: RegisterTokenPayload = {uid: userId};
    return this.jwt.signAsync(payload, {
      secret: this.config.accessJwtSecret,
      expiresIn: this.config.accessExpiresIn,
    });
  }

  /**
   * Register Tokenをデコードして必要な情報を取得する．
   *
   * @param registerToken Register Token
   * @returns Register Tokenから取得出来る情報
   */
  async decodeRegisterToken(registerToken: string): Promise<{userId: string}> {
    return this.jwt
      .verifyAsync<RegisterTokenPayload>(registerToken, {
        secret: this.config.refreshJwtSecret,
      })
      .then(({uid}) => ({userId: uid}));
  }

  async generateRegisterPair(
    userId: string,
  ): Promise<{verifyCode: string; registerToken: string}> {
    return {verifyCode: '', registerToken: ''};
  }

  async updateRegisterPair(
    userId: string,
  ): Promise<{verifyCode: string; registerToken: string}> {
    return {verifyCode: '', registerToken: ''};
  }

  async requestSendEmail(
    tempUserId: string,
    payload: {verifyCode: string},
  ): Promise<void> {
    const userInfo = await this.prisma.temporaryUser.findUnique({
      where: {id: tempUserId},
      rejectOnNotFound: true,
      select: {email: true, alias: true, displayName: true},
    });
  }

  // User registration
  /**
   * idとtokenのペアが正しいかどうかを検証する．
   *
   * @param payload idとtokenのペア
   * @returns idとtokenのペアが正しいか
   */
  async validateRegisterPayload(payload: {
    verifyCode: string;
    registerToken: string;
  }): Promise<boolean> {
    const {verifyCode, registerToken} = payload;
    return this.prisma.register
      .findUnique({where: {verifyCode}, select: {token: true}})
      .then((result) => result?.token === registerToken);
  }

  async registerUser(userId: string): Promise<{userId: string}> {
    return this.prisma.temporaryUser
      .findUnique({
        where: {id: userId},
        select: {
          id: true,
          email: true,
          alias: true,
          displayName: true,
          password: true,
        },
        rejectOnNotFound: true,
      })
      .then((temp) =>
        this.prisma.user.create({data: {...temp}, select: {id: true}}),
      )
      .then(({id}) => ({userId: id}));
  }
}
