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
      displayName: request.displayName,
    });

    const {
      code: verifyCode,
      token: registerToken,
      expiredAt,
    } = await this.signup.createRegisterPair(tempUser.id);

    await this.signup.requestSendEmail(registerToken);

    return {
      result: {
        $case: 'registration',
        registration: {
          verificationCode: verifyCode,
          registerToken,
          expiredAt: this.signup.formatTimestamp(expiredAt),
        },
      },
    };
  }

  async resendVerificationEmail(
    request: ResendVerificationEmailRequest,
  ): Promise<ResendVerificationEmailResponse> {
    const {code, expiredAt, token} = await this.signup.updateRegisterPair(
      request.registerToken,
    );
    await this.signup.requestSendEmail(token);
    return {
      registration: {
        verificationCode: code,
        registerToken: token,
        expiredAt: this.signup.formatTimestamp(expiredAt),
      },
    };
  }

  async registerUser(
    request: RegisterUserRequest,
  ): Promise<RegisterUserResponse> {
    const isValidCredentials = await this.signup.verifyRegisterPair(
      request.registerToken,
      request.verifyCode,
    );
    if (!isValidCredentials)
      throw new RpcException('Invalid register credentials.');

    const {id: userId} = await this.signup.registerUser(request.registerToken);

    const accessToken = await this.tokens.generateAccessToken(userId);
    const refreshToken = await this.tokens.generateRefreshToken(userId);
    return {tokens: {accessToken, refreshToken}};
  }
}
