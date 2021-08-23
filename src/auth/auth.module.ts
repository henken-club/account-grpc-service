import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {ConfigModule} from '@nestjs/config';

import {AuthController} from './auth.controller';
import {AuthConfig} from './auth.config';
import {AuthService} from './auth.service';

import {PrismaModule} from '~/prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({}),
    PrismaModule,
    ConfigModule.forFeature(AuthConfig),
  ],
  controllers: [AuthController],
  providers: [AuthController, AuthService],
})
export class AuthModule {}
