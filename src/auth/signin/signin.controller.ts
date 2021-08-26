import {Controller} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';

import {TokensService} from '../tokens.service';

import {SigninService} from './signin.service';

import {
  HENKENCLUB_ACCOUNT_PACKAGE_NAME,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SigninControllerMethods,
  SigninRequest,
  SigninResponse,
  VerifyTokenRequest,
  VerifyTokenResponse,
  SigninController as ISigninController,
} from '~/protogen/account';

@SigninControllerMethods()
@Controller(HENKENCLUB_ACCOUNT_PACKAGE_NAME)
export class SigninController implements ISigninController {
  constructor(
    private readonly service: SigninService,
    private readonly tokens: TokensService,
  ) {}

  async signin({name, password}: SigninRequest): Promise<SigninResponse> {
    if (!name) throw new RpcException('Invalid input.');

    const {$case, ...where} = name;
    const user = await this.service.findUser(where);

    if (user === null) throw new RpcException('User not found.');

    const isValidCredentials = await this.service.verifyCredentials(
      user.id,
      password,
    );
    if (!isValidCredentials) throw new RpcException('Invalid credentials.');

    const accessToken = await this.tokens.generateAccessToken(user.id);
    const refreshToken = await this.tokens.generateRefreshToken(user.id);
    return {tokens: {accessToken, refreshToken}};
  }

  async verifyToken({
    accessToken,
  }: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    const payload = await this.tokens.verifyAccessToken(accessToken);
    if (payload === null) throw new RpcException('Invalid token.');
    return payload;
  }

  async refreshToken({
    refreshToken: oldToken,
  }: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const payload = await this.tokens.disposeRefreshToken(oldToken);
    if (payload === null) throw new RpcException('Invalid token.');

    const accessToken = await this.tokens.generateAccessToken(payload.userId);
    const refreshToken = await this.tokens.generateRefreshToken(payload.userId);
    return {tokens: {accessToken, refreshToken}};
  }
}
