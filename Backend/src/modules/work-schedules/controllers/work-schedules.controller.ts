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
import { Module } from '../../identity/license/decorators/module.decorator';

import { WorkSchedulesService } from '../services/work-schedules.service';

import { CreateWorkScheduleDto } from '../dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from '../dto/update-work-schedule.dto';
import { WorkScheduleFilterDto } from '../dto/work-schedule-filter.dto';

@Controller('work-schedules')
@Module('HR')
export class WorkSchedulesController {
  constructor(private readonly service: WorkSchedulesService) {}

  @Post()
  @Permissions('work-schedule.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateWorkScheduleDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('work-schedule.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: WorkScheduleFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('work-schedule.view')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('work-schedule.update')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkScheduleDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('work-schedule.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
