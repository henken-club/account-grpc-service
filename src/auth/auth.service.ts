import {Inject, Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {ConfigType} from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import {AuthConfig} from './auth.config';

import {PrismaService} from '~/prisma/prisma.service';

export type AccessTokenPayload = {uid: string};
export type RefreshTokenPayload = {uid: string};

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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

  async findUser(
    where: {email: string} | {alias: string},
  ): Promise<{id: string} | null> {
    return this.prisma.user.findUnique({where, select: {id: true}});
  }

  async createUser({
    encryptedPassword: password,
    ...profile
  }: {
    email: string;
    alias: string;
    displayName: string | null;
    encryptedPassword: string;
  }): Promise<{id: string}> {
    return this.prisma.user.create({
      data: {password, ...profile},
      select: {id: true},
    });
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
