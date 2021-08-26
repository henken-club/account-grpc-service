import {Test} from '@nestjs/testing';
import {INestMicroservice} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';

import {AccountService} from './account.service';
import {AccountController} from './account.controller';

jest.mock('./account.service');

describe('AccountController', () => {
  let app: INestMicroservice;

  let controller: AccountController;
  let service: AccountService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AccountController, AccountService],
    }).compile();

    app = module.createNestMicroservice({});
    await app.init();

    controller = module.get<AccountController>(AccountController);
    service = module.get<AccountService>(AccountService);
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

  describe('getUser()', () => {
    it('throw error if where is not defined', async () => {
      await expect(controller.getUser({})).rejects.toThrow(
        new RpcException('Invalid request.'),
      );
    });

    it('throw error if user not found', async () => {
      jest.spyOn(service, 'getUser').mockResolvedValue(null);

      await expect(
        controller.getUser({where: {$case: 'id', id: '1'}}),
      ).rejects.toThrow(new RpcException('User not found.'));
    });

    it('return user if exists', async () => {
      jest.spyOn(service, 'getUser').mockResolvedValue({
        id: '1',
        alias: 'alias',
        displayName: 'name',
        email: 'me@example.com',
      });

      const result = await controller.getUser({where: {$case: 'id', id: '1'}});

      await expect(result).toStrictEqual({
        user: {
          id: '1',
          alias: 'alias',
          displayName: 'name',
        },
      });
    });
  });
});
