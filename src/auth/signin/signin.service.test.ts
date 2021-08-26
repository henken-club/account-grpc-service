import {Test} from '@nestjs/testing';
import {INestMicroservice} from '@nestjs/common';

import {PasswordService} from '../password.service';

import {SigninService} from './signin.service';

import {PrismaModule} from '~/prisma/prisma.module';
import {PrismaService} from '~/prisma/prisma.service';
import {cleanPrisma} from '~/test/prisma.utils';

jest.mock('../password.service');

describe('SigninService', () => {
  let app: INestMicroservice;

  let prisma: PrismaService;
  let password: PasswordService;

  let signup: SigninService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [PasswordService, SigninService],
    }).compile();

    app = module.createNestMicroservice({});
    await app.init();

    prisma = module.get<PrismaService>(PrismaService);
    password = module.get<PasswordService>(PasswordService);

    signup = module.get<SigninService>(SigninService);
  });

  beforeEach(async () => {
    await cleanPrisma();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await app.close();
  });

  it('to be defined', () => {
    expect(signup).toBeDefined();
  });

  describe('findUser()', () => {
    it('return null if user not found with alias', async () => {
      const actual = await signup.findUser({alias: 'alias'});
      expect(actual).toBeNull();
    });

    it('return null if user not found with email', async () => {
      const actual = await signup.findUser({email: 'me@example.com'});
      expect(actual).toBeNull();
    });

    it('return user info if user found with alias', async () => {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'me@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await signup.findUser({alias: 'alias'});
      expect(actual).toStrictEqual({id: '1'});
    });

    it('return user info if user found with email', async () => {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'me@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await signup.findUser({email: 'me@example.com'});
      expect(actual).toStrictEqual({id: '1'});
    });
  });

  describe('verifyCredentials()', () => {
    it('return true if valid', async () => {
      const comparePassword = jest
        .spyOn(password, 'comparePassword')
        .mockResolvedValue(true);

      await prisma.user.create({
        data: {
          id: '1',
          email: 'me@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await signup.verifyCredentials('1', 'password');
      expect(actual).toBe(true);

      expect(comparePassword).toHaveBeenCalled();
    });

    it('return false if valid', async () => {
      const comparePassword = jest
        .spyOn(password, 'comparePassword')
        .mockResolvedValue(false);

      await prisma.user.create({
        data: {
          id: '1',
          email: 'me@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await signup.verifyCredentials('1', 'password');
      expect(actual).toBe(false);

      expect(comparePassword).toHaveBeenCalled();
    });

    it('return false if user does not exist', async () => {
      const comparePassword = jest
        .spyOn(password, 'comparePassword')
        .mockResolvedValue(false);

      await prisma.user.create({
        data: {
          id: '1',
          email: 'me@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await signup.verifyCredentials('2', 'password');
      expect(actual).toBe(false);

      expect(comparePassword).not.toHaveBeenCalled();
    });
  });
});
