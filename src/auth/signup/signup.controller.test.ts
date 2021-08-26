import {Test} from '@nestjs/testing';
import {INestMicroservice} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';

import {PasswordService} from '../password.service';
import {TokensService} from '../tokens.service';

import {SignupController} from './signup.controller';
import {SignupService} from './signup.service';

import {cleanPrisma} from '~/test/prisma.utils';
import {CreateTemporaryUserResponse_Error_Detail} from '~/protogen/account';

jest.mock('../password.service');
jest.mock('../tokens.service');
jest.mock('./signup.service');

describe('SignupController', () => {
  let app: INestMicroservice;

  let controller: SignupController;
  let service: SignupService;

  let tokens: TokensService;
  let password: PasswordService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PasswordService,
        TokensService,
        SignupController,
        SignupService,
      ],
    }).compile();

    app = module.createNestMicroservice({});
    await app.init();

    controller = module.get<SignupController>(SignupController);
    service = module.get<SignupService>(SignupService);

    tokens = module.get<TokensService>(TokensService);
    password = module.get<PasswordService>(PasswordService);
  });

  beforeEach(async () => {
    await cleanPrisma();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('to be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTemporaryUser()', () => {
    it('return error if email duplicated', async () => {
      const emailDuplicate = jest
        .spyOn(service, 'isEmailDuplicated')
        .mockResolvedValue(true);
      const aliasDuplicate = jest
        .spyOn(service, 'isAliasDuplicated')
        .mockResolvedValue(false);

      const actual = await controller.createTemporaryUser({
        email: 'me@example.com',
        alias: 'alias',
        password: 'password',
        displayName: 'name',
      });

      expect(actual).toStrictEqual({
        result: {
          $case: 'error',
          error: {
            details: [
              CreateTemporaryUserResponse_Error_Detail.DUPLICATED_EMAIL,
            ],
          },
        },
      });

      expect(emailDuplicate).toHaveBeenCalled();
      expect(aliasDuplicate).toHaveBeenCalled();
    });

    it('return error if alias duplicated', async () => {
      const emailDuplicate = jest
        .spyOn(service, 'isEmailDuplicated')
        .mockResolvedValue(false);
      const aliasDuplicate = jest
        .spyOn(service, 'isAliasDuplicated')
        .mockResolvedValue(true);

      const actual = await controller.createTemporaryUser({
        email: 'me@example.com',
        alias: 'alias',
        password: 'password',
        displayName: 'name',
      });

      expect(actual).toStrictEqual({
        result: {
          $case: 'error',
          error: {
            details: [
              CreateTemporaryUserResponse_Error_Detail.DUPLICATED_ALIAS,
            ],
          },
        },
      });

      expect(emailDuplicate).toHaveBeenCalled();
      expect(aliasDuplicate).toHaveBeenCalled();
    });

    it('return error if email and alias duplicated', async () => {
      const emailDuplicate = jest
        .spyOn(service, 'isEmailDuplicated')
        .mockResolvedValue(true);
      const aliasDuplicate = jest
        .spyOn(service, 'isAliasDuplicated')
        .mockResolvedValue(true);

      const actual = await controller.createTemporaryUser({
        email: 'me@example.com',
        alias: 'alias',
        password: 'password',
        displayName: 'name',
      });

      expect(actual).toStrictEqual({
        result: {
          $case: 'error',
          error: {
            details: [
              CreateTemporaryUserResponse_Error_Detail.DUPLICATED_EMAIL,
              CreateTemporaryUserResponse_Error_Detail.DUPLICATED_ALIAS,
            ],
          },
        },
      });

      expect(emailDuplicate).toHaveBeenCalled();
      expect(aliasDuplicate).toHaveBeenCalled();
    });

    it('success', async () => {
      const encryptPassword = jest
        .spyOn(password, 'encryptPassword')
        .mockResolvedValue('encrypted_password');

      const isEmailDup = jest
        .spyOn(service, 'isEmailDuplicated')
        .mockResolvedValue(false);
      const isAliasDup = jest
        .spyOn(service, 'isAliasDuplicated')
        .mockResolvedValue(false);

      const upsertTempUser = jest
        .spyOn(service, 'upsertTemporaryUser')
        .mockResolvedValue({id: '1'});
      const createRegCredentials = jest
        .spyOn(service, 'createRegisterPair')
        .mockResolvedValue({
          code: 'code',
          token: 'token',
          expiredAt: new Date(),
        });

      const requestSendEmail = jest
        .spyOn(service, 'requestSendEmail')
        .mockResolvedValue();
      const formatTimestamp = jest
        .spyOn(service, 'formatTimestamp')
        .mockReturnValue({seconds: 123, nanos: 0});

      const actual = await controller.createTemporaryUser({
        password: 'password',
        email: 'me@example.com',
        alias: 'alias',
        displayName: 'name',
      });

      expect(actual).toStrictEqual({
        result: {
          $case: 'registration',
          registration: {
            verificationCode: 'code',
            registerToken: 'token',
            expiredAt: {seconds: 123, nanos: 0},
          },
        },
      });

      expect(isEmailDup).toHaveBeenCalled();
      expect(isAliasDup).toHaveBeenCalled();

      expect(encryptPassword).toHaveBeenCalled();

      expect(upsertTempUser).toHaveBeenCalled();
      expect(createRegCredentials).toHaveBeenCalled();

      expect(requestSendEmail).toHaveBeenCalled();
      expect(formatTimestamp).toHaveBeenCalled();
    });
  });

  describe('resendVerificationEmail()', () => {
    it('success', async () => {
      const updateRegisterPair = jest
        .spyOn(service, 'updateRegisterPair')
        .mockResolvedValue({
          token: 'new_token',
          code: 'code',
          expiredAt: new Date(),
        });
      const requestSendEmail = jest
        .spyOn(service, 'requestSendEmail')
        .mockResolvedValue();
      const formatTimestamp = jest
        .spyOn(service, 'formatTimestamp')
        .mockReturnValue({seconds: 123, nanos: 0});

      const actual = await controller.resendVerificationEmail({
        registerToken: 'old_token',
      });

      expect(actual).toStrictEqual({
        registration: {
          verificationCode: 'code',
          registerToken: 'new_token',
          expiredAt: {seconds: 123, nanos: 0},
        },
      });

      expect(updateRegisterPair).toHaveBeenCalled();
      expect(requestSendEmail).toHaveBeenCalled();
      expect(formatTimestamp).toHaveBeenCalled();
    });
  });

  describe('registerUser()', () => {
    it('throw error if invalid credentials', async () => {
      const verifyRegisterPair = jest
        .spyOn(service, 'verifyRegisterPair')
        .mockResolvedValue(false);
      const registerUser = jest
        .spyOn(service, 'registerUser')
        .mockResolvedValue({id: '1'});

      await expect(
        controller.registerUser({
          registerToken: 'token',
          verifyCode: 'code',
        }),
      ).rejects.toThrow(new RpcException('Invalid register credentials.'));

      expect(verifyRegisterPair).toHaveBeenCalled();
      expect(registerUser).not.toHaveBeenCalled();
    });

    it('success', async () => {
      const verifyRegisterPair = jest
        .spyOn(service, 'verifyRegisterPair')
        .mockResolvedValue(true);
      const registerUser = jest
        .spyOn(service, 'registerUser')
        .mockResolvedValue({id: '1'});

      const genAccToken = jest
        .spyOn(tokens, 'generateAccessToken')
        .mockResolvedValue('access');
      const genRefToken = jest
        .spyOn(tokens, 'generateRefreshToken')
        .mockResolvedValue('refresh');

      const actual = await controller.registerUser({
        registerToken: 'token',
        verifyCode: 'code',
      });
      await expect(actual).toStrictEqual({
        tokens: {accessToken: 'access', refreshToken: 'refresh'},
      });

      expect(verifyRegisterPair).toHaveBeenCalled();
      expect(registerUser).toHaveBeenCalled();
      expect(genAccToken).toHaveBeenCalled();
      expect(genRefToken).toHaveBeenCalled();
    });
  });
});
