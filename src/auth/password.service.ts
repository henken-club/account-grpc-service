import {Inject, Injectable} from '@nestjs/common';
import {ConfigType} from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import {AuthConfig} from './auth.config';

@Injectable()
export class PasswordService {
  constructor(
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
  ) {}

  // Password

  /**
   * 平文のパスワードを暗号化する．
   *
   * @param plain 平文
   * @returns 暗号化されたパスワード
   */
  async encryptPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.config.bcryptRound);
  }

  /**
   * 暗号化されたパスワードが入力と正しいか判定する.
   *
   * @param input 入力されたパスワード
   * @param encrypted 暗号化されたパスワード
   * @returns 合致しているかどうか
   */
  async comparePassword(input: string, encrypted: string): Promise<boolean> {
    return bcrypt.compare(input, encrypted);
  }
}
