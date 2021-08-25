import {Inject, Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {ConfigType} from '@nestjs/config';

import {AuthConfig} from './auth.config';

export type AccessTokenPayload = {uid: string};
export type RefreshTokenPayload = {uid: string};

@Injectable()
export class TokensService {
  constructor(
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
    private readonly jwt: JwtService,
  ) {}

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
