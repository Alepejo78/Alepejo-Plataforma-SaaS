import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../identity/auth/interfaces/authenticated-user.interface';

import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Visão geral da página inicial — consolidada entre as empresas do grupo pra quem administra mais de uma.',
  })
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('year') year?: string,
  ) {
    const parsedYear = Number(year);
    const targetYear =
      year && Number.isInteger(parsedYear)
        ? parsedYear
        : new Date().getFullYear();

    return this.service.getOverview(user, targetYear);
  }
}
