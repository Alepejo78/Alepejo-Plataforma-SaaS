import { Controller, Get, Query } from '@nestjs/common';

import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { CboService } from '../services/cbo.service';
import { CboFilterDto } from '../dto/cbo-filter.dto';

@Controller('cbo')
@Module('HR')
export class CboController {
  constructor(private readonly service: CboService) {}

  @Get()
  @Permissions('job-function.view')
  findAll(@Query() filter: CboFilterDto) {
    return this.service.findAll(filter);
  }
}
