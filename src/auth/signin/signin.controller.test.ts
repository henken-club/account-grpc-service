import {Test} from '@nestjs/testing';
import {INestMicroservice} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';

import {TokensService} from '../tokens.service';

import {SigninController} from './signin.controller';
import {SigninService} from './signin.service';

jest.mock('./signin.service');
jest.mock('../tokens.service');

describe('AccountController', () => {
  let app: INestMicroservice;

  let controller: SigninController;
  let service: SigninService;

  let tokens: TokensService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TokensService, SigninController, SigninService],
    }).compile();

    app = module.createNestMicroservice({});
    await app.init();

    controller = module.get<SigninController>(SigninController);
    service = module.get<SigninService>(SigninService);

    tokens = module.get<TokensService>(TokensService);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('to be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signin()', () => {
    it('throw error if request.name undefined', async () => {
      await expect(
        controller.signin({name: undefined, password: 'password'}),
      ).rejects.toThrow(new RpcException('Invalid input.'));
    });

    it('throw error if user not found', async () => {
      const findUser = jest.spyOn(service, 'findUser').mockResolvedValue(null);

      await expect(
        controller.signin({
          name: {$case: 'alias', alias: 'alias'},
          password: 'password',
        }),
      ).rejects.toThrow(new RpcException('User not found.'));

      expect(findUser).toHaveBeenCalled();
    });

    it('throw error if invalid credentials', async () => {
      const findUser = jest
        .spyOn(service, 'findUser')
        .mockResolvedValue({id: '1'});
      const verifyCredentials = jest
        .spyOn(service, 'verifyCredentials')
        .mockResolvedValue(false);

      await expect(
        controller.signin({
          name: {$case: 'alias', alias: 'alias'},
          password: 'password',
        }),
      ).rejects.toThrow(new RpcException('Invalid credentials.'));

      expect(findUser).toHaveBeenCalled();
      expect(verifyCredentials).toHaveBeenCalled();
    });

    it('generate tokens if success', async () => {
      const findUser = jest
        .spyOn(service, 'findUser')
        .mockResolvedValue({id: '1'});
      const verifyCredentials = jest
        .spyOn(service, 'verifyCredentials')
        .mockResolvedValue(true);
      const genAccToken = jest
        .spyOn(tokens, 'generateAccessToken')
        .mockResolvedValue('access_token');
      const genRefToken = jest
        .spyOn(tokens, 'generateRefreshToken')
        .mockResolvedValue('refresh_token');

      const actual = await controller.signin({
        name: {$case: 'alias', alias: 'alias'},
        password: 'password',
      });
      expect(actual).toStrictEqual({
        tokens: {
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
        },
      });

      expect(findUser).toHaveBeenCalled();
      expect(verifyCredentials).toHaveBeenCalled();
      expect(genAccToken).toHaveBeenCalled();
      expect(genRefToken).toHaveBeenCalled();
    });
  });

  describe('verifyToken()', () => {
    it('return token payload', async () => {
      const verifyAccToken = jest
        .spyOn(tokens, 'verifyAccessToken')
        .mockResolvedValue({userId: '1'});

      const actual = await controller.verifyToken({accessToken: 'token'});
      expect(actual).toStrictEqual({userId: '1'});

      expect(verifyAccToken).toHaveBeenCalled();
    });

    it('throw error if token payload null', async () => {
      const verifyAccToken = jest
        .spyOn(tokens, 'verifyAccessToken')
        .mockResolvedValue(null);

      await expect(
        controller.verifyToken({accessToken: 'token'}),
      ).rejects.toThrow(new RpcException('Invalid token.'));

      expect(verifyAccToken).toHaveBeenCalled();
    });
  });
});
