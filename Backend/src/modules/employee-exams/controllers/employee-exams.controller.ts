import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { EmployeeExamsService } from '../services/employee-exams.service';

import { CreateEmployeeExamDto } from '../dto/create-employee-exam.dto';
import { EmployeeExamFilterDto } from '../dto/employee-exam-filter.dto';

@Controller('employee-exams')
@Module('HR')
export class EmployeeExamsController {
  constructor(private readonly service: EmployeeExamsService) {}

  @Post()
  @Permissions('employee.update')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateEmployeeExamDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('employee.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: EmployeeExamFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Delete(':id')
  @Permissions('employee.update')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
