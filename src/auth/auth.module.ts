import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {ConfigModule} from '@nestjs/config';

import {SigninController} from './signin/signin.controller';
import {AuthConfig} from './auth.config';
import {SigninService} from './signin/signin.service';
import {SignupController} from './signup/signup.controller';
import {TokensService} from './tokens.service';
import {SignupService} from './signup/signup.service';
import {PasswordService} from './password.service';

import {PrismaModule} from '~/prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({}),
    PrismaModule,
    ConfigModule.forFeature(AuthConfig),
  ],
  controllers: [SignupController, SigninController],
  providers: [
    PasswordService,
    TokensService,
    SigninService,
    SigninController,
    SignupService,
    SignupController,
  ],
})
export class AuthModule {}
