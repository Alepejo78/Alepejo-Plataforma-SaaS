import { Body, Controller, Get, Put, Query } from '@nestjs/common';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { BudgetsService } from '../services/budgets.service';
import { UpsertBudgetDto } from '../dto/upsert-budget.dto';

@Controller('budgets')
@Module('FINANCE')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Get()
  @Permissions('budget.view')
  getYear(
    @CurrentUser('companyId') companyId: string,
    @Query('year') year?: string,
  ) {
    const parsedYear = Number(year);
    const targetYear =
      year && Number.isInteger(parsedYear)
        ? parsedYear
        : new Date().getFullYear();

    return this.service.getYear(companyId, targetYear);
  }

  @Put()
  @Permissions('budget.manage')
  upsert(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpsertBudgetDto,
  ) {
    return this.service.upsert(companyId, dto);
  }
}
