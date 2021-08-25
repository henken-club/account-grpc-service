import {Controller} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';

import {TokensService} from '../tokens.service';
import {PasswordService} from '../password.service';

import {SignupService} from './signup.service';

import {
  HENKENCLUB_ACCOUNT_PACKAGE_NAME,
  RegisterUserRequest,
  RegisterUserResponse,
  SignupControllerMethods,
  SignupController as ISignupController,
  CreateTemporaryUserRequest,
  CreateTemporaryUserResponse,
  CreateTemporaryUserResponse_Error_Detail,
  ResendVerificationEmailRequest,
  ResendVerificationEmailResponse,
} from '~/protogen/account';

@SignupControllerMethods()
@Controller(HENKENCLUB_ACCOUNT_PACKAGE_NAME)
export class SignupController implements ISignupController {
  constructor(
    private readonly signup: SignupService,
    private readonly password: PasswordService,
    private readonly tokens: TokensService,
  ) {}

  async createTemporaryUser(
    request: CreateTemporaryUserRequest,
  ): Promise<CreateTemporaryUserResponse> {
    const emailDuplicate = await this.signup.isEmailDuplicated(request.email);
    const aliasDuplicate = await this.signup.isAliasDuplicated(request.alias);
    if (emailDuplicate || aliasDuplicate)
      return {
        result: {
          $case: 'error',
          error: {
            details: [
              ...(emailDuplicate
                ? [CreateTemporaryUserResponse_Error_Detail.DUPLICATED_EMAIL]
                : []),
              ...(aliasDuplicate
                ? [CreateTemporaryUserResponse_Error_Detail.DUPLICATED_ALIAS]
                : []),
            ],
          },
        },
      };

    const encryptedPassword = await this.password.encryptPassword(
      request.password,
    );

    const tempUser = await this.signup.upsertTemporaryUser({
      email: request.email,
      alias: request.alias,
      password: encryptedPassword,
      displayName: request.displayName || request.alias,
    });

    const {verifyCode, registerToken} = await this.signup.generateRegisterPair(
      tempUser.id,
    );

    await this.signup.requestSendEmail(tempUser.id, {verifyCode});

    return {
      result: {$case: 'pair', pair: {verifyCode, registerToken}},
    };
  }

  async resendVerificationEmail({
    registerToken,
  }: ResendVerificationEmailRequest): Promise<ResendVerificationEmailResponse> {
    const {userId} = await this.signup.decodeRegisterToken(registerToken);
    const {verifyCode} = await this.signup.updateRegisterPair(userId);
    await this.signup.requestSendEmail(userId, {verifyCode});
    return {verifyCode};
  }

  async registerUser({
    verifyCode: registerId,
    registerToken,
  }: RegisterUserRequest): Promise<RegisterUserResponse> {
    if (
      await this.signup.validateRegisterPayload({
        verifyCode: registerId,
        registerToken,
      })
    )
      throw new RpcException('Invalid register pair.');

    const {userId: tempUserId} = await this.signup.decodeRegisterToken(
      registerToken,
    );

    // 既に登録済みの場合の処理を書く

    const {userId} = await this.signup.registerUser(tempUserId);

    const accessToken = await this.tokens.generateAccessToken(userId);
    const refreshToken = await this.tokens.generateRefreshToken(userId);
    return {tokens: {accessToken, refreshToken}};
  }
}
