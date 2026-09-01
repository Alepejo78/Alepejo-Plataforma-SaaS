import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { BankAccountsService } from '../services/bank-accounts.service';

import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly service: BankAccountsService) {}

  @Post()
  @Permissions('bank-account.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBankAccountDto,
  ) {
    return this.service.create(companyId, dto, userId);
  }

  @Get()
  @Permissions('bank-account.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(companyId, includeInactive === 'true');
  }

  @Get(':id')
  @Permissions('bank-account.view')
  findById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findById(companyId, id);
  }

  @Patch(':id')
  @Permissions('bank-account.update')
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.service.update(companyId, id, dto, userId);
  }

  @Delete(':id')
  @Permissions('bank-account.delete')
  async remove(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.service.remove(companyId, id, userId);

    return { success: true, message: 'Conta bancária removida com sucesso.' };
  }
}
