import {Controller} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';

import {AccountService} from './account.service';

import {
  AliasUserRequest,
  IDUserRequest,
  AccountController as AccountServiceController,
  AccountControllerMethods,
  HENKENCLUB_ACCOUNT_PACKAGE_NAME,
} from '~/protogen/account';

@AccountControllerMethods()
@Controller(HENKENCLUB_ACCOUNT_PACKAGE_NAME)
export class AccountController implements AccountServiceController {
  constructor(private readonly managerService: AccountService) {}

  async getUserFromID({id}: IDUserRequest) {
    const result = await this.managerService.getUser({id});
    if (result === null) throw new RpcException('User not found.');
    return {
      id: result.id,
      alias: result.alias,
      ...(result.displayName ? {displayName: result.displayName} : {}),
    };
  }

  async getUserFromAlias({alias}: AliasUserRequest) {
    const result = await this.managerService.getUser({alias});
    if (result === null) throw new RpcException('User not found.');
    return {
      id: result.id,
      alias: result.alias,
      ...(result.displayName ? {displayName: result.displayName} : {}),
    };
  }
}
