import {Test} from '@nestjs/testing';
import {INestMicroservice} from '@nestjs/common';
import {ConfigType} from '@nestjs/config';

import {AuthConfig} from '../auth.config';
import {PasswordService} from '../password.service';

import {SignupService} from './signup.service';

import {PrismaModule} from '~/prisma/prisma.module';
import {PrismaService} from '~/prisma/prisma.service';
import {cleanPrisma} from '~/test/prisma.utils';

jest.mock('../password.service');

describe('SignupService', () => {
  let app: INestMicroservice;

  let prisma: PrismaService;
  let config: ConfigType<typeof AuthConfig>;
  let password: PasswordService;

  let signup: SignupService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        PasswordService,
        SignupService,
        {provide: AuthConfig.KEY, useValue: {}},
      ],
    }).compile();

    app = module.createNestMicroservice({});
    await app.init();

    prisma = module.get<PrismaService>(PrismaService);
    config = module.get<ConfigType<typeof AuthConfig>>(AuthConfig.KEY);
    password = module.get<PasswordService>(PasswordService);

    signup = module.get<SignupService>(SignupService);
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

  describe('formatTimestamp()', () => {
    it.each([
      [0, {seconds: 0, nanos: 0}],
      [1, {seconds: 0, nanos: 1000000}],
      [1000, {seconds: 1, nanos: 0}],
      [-1000, {seconds: -1, nanos: 0}],
    ])('calculate timestamp %i', async (input, expected) => {
      const actual = await signup.formatTimestamp(new Date(input));
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('isEmailDuplicated()', () => {
    it('return true if email duplicated', async () => {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'example1@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await signup.isEmailDuplicated('example1@example.com');
      expect(actual).toBe(true);
    });

    it('return false if email duplicated', async () => {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'example2@example.com',
          alias: 'alias',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await signup.isEmailDuplicated('example1@example.com');
      expect(actual).toBe(false);
    });
  });

  describe('isAliasDuplicated()', () => {
    it('return true if email duplicated', async () => {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'example@example.com',
          alias: 'alias1',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await signup.isAliasDuplicated('alias1');
      expect(actual).toBe(true);
    });

    it('return false if email duplicated', async () => {
      await prisma.user.create({
        data: {
          id: '1',
          email: 'example@example.com',
          alias: 'alias2',
          password: 'password',
          displayName: 'name',
        },
      });

      const actual = await signup.isAliasDuplicated('alias1');
      expect(actual).toBe(false);
    });
  });

  describe('generateVerificationCode()', () => {
    it('simply returns some unique value', async () => {
      const actual = await signup.generateVerificationCode();
      expect(actual).toStrictEqual(expect.any(String));
    });
  });

  describe('generateRegisterToken()', () => {
    it('simply returns some unique value', async () => {
      const actual = await signup.generateRegisterToken();
      expect(actual).toStrictEqual(expect.any(String));
    });
  });

  describe('calculateExpiredAt()', () => {
    it('calculate with ms format', async () => {
      jest.spyOn(Date, 'now').mockImplementation(() => 0);
      config.registrationExpiresIn = '1s';

      const actual = await signup.calculateExpiredAt();
      expect(actual).toStrictEqual(new Date(1000));
    });
  });

  describe('upsertTemporaryUser()', () => {
    it('create temporary user first', async () => {
      const encryptPassword = jest
        .spyOn(password, 'encryptPassword')
        .mockResolvedValue('encrypted_password');

      const actual = await signup.upsertTemporaryUser({
        email: 'me@example.com',
        password: 'password',
        alias: 'alias',
        displayName: 'name',
      });
      expect(actual).toStrictEqual({id: expect.any(String)});

      const prismaActual = await prisma.temporaryUser.findUnique({
        where: {id: actual.id},
      });
      expect(prismaActual).toStrictEqual({
        id: actual.id,
        email: 'me@example.com',
        password: 'encrypted_password',
        alias: 'alias',
        displayName: 'name',
      });

      const count = await prisma.temporaryUser.count();
      expect(count).toBe(1);

      expect(encryptPassword).toHaveBeenCalled();
    });

    it('use alias instead undefined displayName', async () => {
      const encryptPassword = jest
        .spyOn(password, 'encryptPassword')
        .mockResolvedValue('encrypted_password');

      const actual = await signup.upsertTemporaryUser({
        email: 'me@example.com',
        password: 'password',
        alias: 'alias',
      });
      expect(actual).toStrictEqual({id: expect.any(String)});

      const prismaActual = await prisma.temporaryUser.findUnique({
        where: {id: actual.id},
      });
      expect(prismaActual).toStrictEqual({
        id: actual.id,
        email: 'me@example.com',
        password: 'encrypted_password',
        alias: 'alias',
        displayName: 'alias',
      });

      const count = await prisma.temporaryUser.count();
      expect(count).toBe(1);

      expect(encryptPassword).toHaveBeenCalled();
    });

    it('update temporary user', async () => {
      const encryptPassword = jest
        .spyOn(password, 'encryptPassword')
        .mockResolvedValue('encrypted_password');

      const {id: alreadyId} = await prisma.temporaryUser.create({
        data: {
          email: 'me@example.com',
          password: 'password_old',
          alias: 'alias_old',
          displayName: 'name_old',
        },
        select: {id: true},
      });

      const actual = await signup.upsertTemporaryUser({
        email: 'me@example.com',
        password: 'password_new',
        alias: 'alias_new',
        displayName: 'name_new',
      });
      expect(actual).toStrictEqual({id: expect.any(String)});

      const prismaActual = await prisma.temporaryUser.findUnique({
        where: {id: alreadyId},
      });
      expect(prismaActual).toStrictEqual({
        id: alreadyId,
        email: 'me@example.com',
        password: 'encrypted_password',
        alias: 'alias_new',
        displayName: 'name_new',
      });

      const count = await prisma.temporaryUser.count();
      expect(count).toBe(1);

      expect(encryptPassword).toHaveBeenCalled();
    });
  });

  describe('registerUser()', () => {
    it('throw error if registration was not found with token', async () => {
      await expect(signup.registerUser('token')).rejects.toThrow(
        new Error('Registration with token "token" was not found.'),
      );
    });

    it('create new user', async () => {
      await prisma.registration.create({
        data: {
          code: 'code',
          token: 'token',
          expiredAt: new Date(),
          user: {
            create: {
              id: '1',
              email: 'me@example.com',
              password: 'password',
              alias: 'alias',
              displayName: 'name',
            },
          },
        },
      });

      const actual = await signup.registerUser('token');
      expect(actual).toStrictEqual({id: '1'});

      const prismaActual = await prisma.user.findUnique({where: {id: '1'}});
      expect(prismaActual).toStrictEqual({
        id: '1',
        email: 'me@example.com',
        password: 'password',
        alias: 'alias',
        displayName: 'name',
      });
    });

    it('dispose if user was registered', async () => {
      await prisma.registration.create({
        data: {
          code: 'code',
          token: 'token',
          expiredAt: new Date(),
          user: {
            create: {
              id: '1',
              email: 'new@example.com',
              password: 'password_new',
              alias: 'alias_new',
              displayName: 'name_new',
            },
          },
        },
      });
      await prisma.user.create({
        data: {
          id: '1',
          email: 'already@example.com',
          password: 'password_already',
          alias: 'alias_already',
          displayName: 'name_already',
        },
      });

      const actual = await signup.registerUser('token');
      expect(actual).toStrictEqual({id: '1'});

      const prismaActual = await prisma.user.findUnique({where: {id: '1'}});
      expect(prismaActual).toStrictEqual({
        id: '1',
        email: 'already@example.com',
        password: 'password_already',
        alias: 'alias_already',
        displayName: 'name_already',
      });
    });
  });
});
