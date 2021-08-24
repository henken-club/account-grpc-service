import {Controller} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';

import {AuthService} from './auth.service';

import {
  AuthController as AccountServiceController,
  AuthControllerMethods,
  HENKENCLUB_ACCOUNT_PACKAGE_NAME,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterUserRequest,
  RegisterUserResponse,
  ResendVerifyEmailRequest,
  ResendVerifyEmailResponse,
  SigninRequest,
  SigninResponse,
  SignupRequest,
  SignupResponse,
  SignupResponse_Error_Detail,
  VerifyTokenRequest,
  VerifyTokenResponse,
} from '~/protogen/account';

@AuthControllerMethods()
@Controller(HENKENCLUB_ACCOUNT_PACKAGE_NAME)
export class AuthController implements AccountServiceController {
  constructor(private readonly auth: AuthService) {}

  async signup(request: SignupRequest): Promise<SignupResponse> {
    const emailDuplicate = await this.auth.isEmailDuplicated(request.email);
    const aliasDuplicate = await this.auth.isAliasDuplicated(request.alias);
    if (emailDuplicate || aliasDuplicate)
      return {
        result: {
          $case: 'error',
          error: {
            details: [
              ...(emailDuplicate
                ? [SignupResponse_Error_Detail.DUPLICATED_EMAIL]
                : []),
              ...(aliasDuplicate
                ? [SignupResponse_Error_Detail.DUPLICATED_ALIAS]
                : []),
            ],
          },
        },
      };

    const encryptedPassword = await this.auth.encryptPassword(request.password);

    const {userId} = await this.auth.upsertTemporaryUser({
      email: request.email,
      alias: request.alias,
      encryptedPassword,
      displayName: request.displayName || request.alias,
    });

    const {registerId, registerToken} = await this.auth.generateRegisterPair(
      userId,
    );

    await this.auth.requestSendEmail(userId, {registerId});

    return {result: {$case: 'pair', pair: {registerId, registerToken}}};
  }

  async resendVerifyEmail({
    registerToken,
  }: ResendVerifyEmailRequest): Promise<ResendVerifyEmailResponse> {
    const {userId} = await this.auth.decodeRegisterToken(registerToken);
    const {registerId} = await this.auth.updateRegisterPair(userId);
    await this.auth.requestSendEmail(userId, {registerId});
    return {registerId};
  }

  async registerUser({
    registerId,
    registerToken,
  }: RegisterUserRequest): Promise<RegisterUserResponse> {
    if (await this.auth.validateRegisterPayload({registerId, registerToken}))
      throw new RpcException('Invalid pair.');

    const {userId: tempUserId} = await this.auth.decodeRegisterToken(
      registerToken,
    );
    const {userId} = await this.auth.registerUser(tempUserId);

    const accessToken = await this.auth.generateAccessToken(userId);
    const refreshToken = await this.auth.generateRefreshToken(userId);
    return {tokens: {accessToken, refreshToken}};
  }

  async signin({name, password}: SigninRequest): Promise<SigninResponse> {
    if (!name) throw new RpcException('Invalid input.');

    const {$case, ...where} = name;
    const value = await this.auth.findUser(where);

    if (value === null) throw new RpcException('User not found.');

    if (this.auth.verifyPassword(value.id, password))
      throw new RpcException('Invalid credentials.');

    const accessToken = await this.auth.generateAccessToken(value.id);
    const refreshToken = await this.auth.generateRefreshToken(value.id);
    return {tokens: {accessToken, refreshToken}};
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
    return {tokens: {accessToken, refreshToken}};
  }
}
