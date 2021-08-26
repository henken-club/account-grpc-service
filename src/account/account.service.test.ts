import {Test} from '@nestjs/testing';
import {INestMicroservice} from '@nestjs/common';

import {AccountService} from './account.service';

import {PrismaModule} from '~/prisma/prisma.module';
import {PrismaService} from '~/prisma/prisma.service';
import {cleanPrisma} from '~/test/prisma.utils';

describe('AccountService', () => {
  let app: INestMicroservice;

  let prisma: PrismaService;
  let account: AccountService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AccountService],
    }).compile();

    app = module.createNestMicroservice({});
    await app.init();

    prisma = module.get<PrismaService>(PrismaService);
    account = module.get<AccountService>(AccountService);
  });

  beforeEach(async () => {
    await cleanPrisma();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('to be defined', () => {
    expect(account).toBeDefined();
  });

  describe('getUser()', () => {
    it('return user with id', async () => {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'me@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await account.getUser({id: '1'});
      expect(actual).toStrictEqual({
        id: '1',
        email: 'me@example.com',
        alias: 'alias',
        displayName: 'name',
      });
    });

    it('return user with alias', async () => {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'me@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await account.getUser({alias: 'alias'});
      expect(actual).toStrictEqual({
        id: '1',
        email: 'me@example.com',
        alias: 'alias',
        displayName: 'name',
      });
    });

    it('return user with email', async () => {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'me@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await account.getUser({
        email: 'me@example.com',
      });
      expect(actual).toStrictEqual({
        id: '1',
        email: 'me@example.com',
        alias: 'alias',
        displayName: 'name',
      });
    });

    it('return null if user does not exist', async () => {
      const actual = await account.getUser({id: '1'});
      expect(actual).toBeNull();
    });
  });
});
