import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {ConfigModule, ConfigType} from '@nestjs/config';

import {AuthController} from './auth.controller';
import {AuthConfig} from './auth.config';
import {AuthService} from './auth.service';

import {PrismaModule} from '~/prisma/prisma.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(AuthConfig)],
      inject: [AuthConfig.KEY],
      useFactory: async (config: ConfigType<typeof AuthConfig>) => ({}),
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthController, AuthService],
})
export class AuthModule {}
