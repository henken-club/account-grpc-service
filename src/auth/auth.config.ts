import {registerAs} from '@nestjs/config';

export const AuthConfig = registerAs('auth', () => ({
  bcryptRound: process.env.JWT_ACCESS_SECRET
    ? parseInt(process.env.JWT_ACCESS_SECRET!, 10)
    : 10,

  accessJwtSecret: process.env.JWT_ACCESS_SECRET!,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRE_DURATION || '7d',

  refreshJwtSecret: process.env.JWT_REFRESH_SECRET!,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE_DURATION || '7d',
}));
