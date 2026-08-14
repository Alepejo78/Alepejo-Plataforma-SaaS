import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { WorkScheduleShiftsService } from '../services/work-schedule-shifts.service';

import { CreateWorkScheduleShiftDto } from '../dto/create-work-schedule-shift.dto';
import { UpdateWorkScheduleShiftDto } from '../dto/update-work-schedule-shift.dto';

/** Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz do grupo (rootCompanyId), ver WarehouseController. */
@Controller('work-schedules/:workScheduleId/shifts')
@Module('HR')
export class WorkScheduleShiftsController {
  constructor(
    private readonly service: WorkScheduleShiftsService,
  ) {}

  @Post()
  @Permissions('work-schedule.update')
  create(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('workScheduleId') workScheduleId: string,
    @Body() dto: CreateWorkScheduleShiftDto,
  ) {
    return this.service.create(companyId, workScheduleId, dto);
  }

  @Get()
  @Permissions('work-schedule.view')
  findAll(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('workScheduleId') workScheduleId: string,
  ) {
    return this.service.findAll(companyId, workScheduleId);
  }

  @Patch(':id')
  @Permissions('work-schedule.update')
  update(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('workScheduleId') workScheduleId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkScheduleShiftDto,
  ) {
    return this.service.update(
      companyId,
      workScheduleId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @Permissions('work-schedule.update')
  remove(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('workScheduleId') workScheduleId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, workScheduleId, id);
  }
}
