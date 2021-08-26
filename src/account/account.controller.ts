import {Controller} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';

import {AccountService} from './account.service';

import {
  AccountController as AccountServiceController,
  AccountControllerMethods,
  HENKENCLUB_ACCOUNT_PACKAGE_NAME,
  GetUserRequest,
  GetUserResponse,
} from '~/protogen/account';

@AccountControllerMethods()
@Controller(HENKENCLUB_ACCOUNT_PACKAGE_NAME)
export class AccountController implements AccountServiceController {
  constructor(private readonly managerService: AccountService) {}

  async getUser(request: GetUserRequest): Promise<GetUserResponse> {
    if (!request.where) throw new RpcException('Invalid request.');

    const {
      where: {$case, ...where},
    } = request;

    const result = await this.managerService.getUser(where);
    if (result === null) throw new RpcException('User not found.');

    return {
      user: {
        id: result.id,
        alias: result.alias,
        displayName: result.displayName,
      },
    };
  }
}
