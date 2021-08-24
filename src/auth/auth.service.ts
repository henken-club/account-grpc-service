import {Inject, Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {ConfigType} from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import {AuthConfig} from './auth.config';

import {PrismaService} from '~/prisma/prisma.service';

export type AccessTokenPayload = {uid: string};
export type RefreshTokenPayload = {uid: string};
export type RegisterTokenPayload = {uid: string};

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // Password

  /**
   * 平文のパスワードを暗号化する．
   *
   * @param plain 平文
   * @returns 暗号化されたパスワード
   */
  async encryptPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.config.bcryptRound);
  }

  /**
   * ユーザIDに紐づくパスワードが入力と正しいか検証する．
   *
   * @param userId ユーザーID
   * @param input 入力されたパスワード
   * @returns ユーザIDに紐づくパスワードが入力と合致していたら`true`，それ以外の場合は`false`
   */
  async verifyPassword(userId: string, input: string): Promise<boolean> {
    return this.prisma.user
      .findUnique({
        where: {id: userId},
        select: {password: true},
        rejectOnNotFound: true,
      })
      .then(({password}) => bcrypt.compare(input, password))
      .catch(() => false);
  }

  // Sign up

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
    encryptedPassword: password,
    email,
    alias,
    displayName,
  }: {
    encryptedPassword: string;
    email: string;
    alias: string;
    displayName: string;
  }): Promise<{userId: string}> {
    return this.prisma.temporaryUser
      .upsert({
        where: {email},
        create: {email, alias, password, displayName},
        update: {alias, password, displayName},
        select: {id: true},
      })
      .then(({id}) => ({userId: id}));
  }

  async generateRegisterToken(userId: string): Promise<string> {
    const payload: AccessTokenPayload = {uid: userId};
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
  ): Promise<{registerId: string; registerToken: string}> {
    return {registerId: '', registerToken: ''};
  }

  async updateRegisterPair(
    userId: string,
  ): Promise<{registerId: string; registerToken: string}> {
    return {registerId: '', registerToken: ''};
  }

  async requestSendEmail(
    userId: string,
    payload: {registerId: string},
  ): Promise<void> {
    const userInfo = await this.prisma.temporaryUser.findUnique({
      where: {id: userId},
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
    registerId: string;
    registerToken: string;
  }): Promise<boolean> {
    return true;
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

  // Login

  async findUser(
    where: {email: string} | {alias: string},
  ): Promise<{id: string} | null> {
    return this.prisma.user.findUnique({where, select: {id: true}});
  }

  /**
   * Access Tokenを生成する
   *
   * @param userId ユーザID
   * @returns Access Token
   */
  async generateAccessToken(userId: string): Promise<string> {
    const payload: AccessTokenPayload = {uid: userId};
    return this.jwt.signAsync(payload, {
      secret: this.config.accessJwtSecret,
      expiresIn: this.config.accessExpiresIn,
    });
  }

  /**
   * Refresh Tokenを生成する
   *
   * @param userId ユーザID
   * @returns Refresh Token
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const payload: RefreshTokenPayload = {uid: userId};
    return this.jwt.signAsync(payload, {
      secret: this.config.refreshJwtSecret,
      expiresIn: this.config.refreshExpiresIn,
    });
  }

  /**
   * Access Tokenを検証する．
   *
   * @param accessToken Access Token
   * @returns トークンが有効ならばトークン内の情報を，無効ならばnullを返却
   */
  async verifyAccessToken(
    accessToken: string,
  ): Promise<{userId: string} | null> {
    return this.jwt
      .verifyAsync<AccessTokenPayload>(accessToken, {
        secret: this.config.accessJwtSecret,
      })
      .then(({uid}) => ({userId: uid}))
      .catch(() => null);
  }

  /**
   * Refresh Tokenを検証して破棄する．
   *
   * @param accessToken Refresh Token
   * @returns トークンが有効ならばトークン内の情報を，無効ならばnullを返却
   */
  async disposeRefreshToken(
    refreshToken: string,
  ): Promise<{userId: string} | null> {
    return this.jwt
      .verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.refreshJwtSecret,
      })
      .then(({uid}) => ({userId: uid}))
      .catch(() => null);
  }
}
