import {Controller} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';

import {AuthService} from './auth.service';

import {
  AliasSigninRequest,
  AuthController as AccountServiceController,
  AuthControllerMethods,
  EmailSigninRequest,
  HENKENCLUB_ACCOUNT_PACKAGE_NAME,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SigninResponse,
  SignupRequest,
  SignupResponse,
  VerifyTokenRequest,
  VerifyTokenResponse,
} from '~/protogen/account';

@AuthControllerMethods()
@Controller(HENKENCLUB_ACCOUNT_PACKAGE_NAME)
export class AuthController implements AccountServiceController {
  constructor(private readonly auth: AuthService) {}

  async signup({
    email,
    alias,
    password,
    displayName,
  }: SignupRequest): Promise<SignupResponse> {
    const encryptedPassword = await this.auth.encryptPassword(password);

    const {id} = await this.auth.createUser({
      email,
      alias,
      encryptedPassword,
      displayName: displayName || null,
    });
    const accessToken = await this.auth.generateAccessToken(id);
    const refreshToken = await this.auth.generateRefreshToken(id);
    return {accessToken, refreshToken};
  }

  async signinWithEmail({
    email,
    password,
  }: EmailSigninRequest): Promise<SigninResponse> {
    const value = await this.auth.findUser({email});

    if (value === null) throw new RpcException('User not found.');

    if (this.auth.verifyPassword(value.id, password))
      throw new RpcException('Invalid credentials.');

    const accessToken = await this.auth.generateAccessToken(value.id);
    const refreshToken = await this.auth.generateRefreshToken(value.id);
    return {accessToken, refreshToken};
  }

  async signinWithAlias({
    alias,
    password,
  }: AliasSigninRequest): Promise<SigninResponse> {
    const value = await this.auth.findUser({alias});

    if (value === null) throw new RpcException('User not found.');

    if (this.auth.verifyPassword(value.id, password))
      throw new RpcException('Invalid credentials.');

    const accessToken = await this.auth.generateAccessToken(value.id);
    const refreshToken = await this.auth.generateRefreshToken(value.id);
    return {accessToken, refreshToken};
  }

  async verifyToken({
    accessToken,
  }: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    const payload = await this.auth.verifyAccessToken(accessToken);
    if (payload === null) throw new RpcException('Invalid token.');
    return payload;
  }

  async refreshToken({
    refreshToken: oldToken,
  }: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const payload = await this.auth.verifyAccessToken(oldToken);
    if (payload === null) throw new RpcException('Invalid token.');

    const accessToken = await this.auth.generateAccessToken(payload.userId);
    const refreshToken = await this.auth.generateRefreshToken(payload.userId);
    return {accessToken, refreshToken};
  }
}
