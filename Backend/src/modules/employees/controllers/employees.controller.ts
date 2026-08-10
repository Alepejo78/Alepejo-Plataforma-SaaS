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

import { EmployeesService } from '../services/employees.service';

import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeFilterDto } from '../dto/employee-filter.dto';

@Controller('employees')
@Module('HR')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Post()
  @Permissions('employee.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('employee.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: EmployeeFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get('reports/birthdays')
  @Permissions('employee.view')
  getBirthdays(
    @CurrentUser('companyId') companyId: string,
    @Query('month') month?: string,
  ) {
    return this.service.getBirthdays(
      companyId,
      month ? Number(month) : undefined,
    );
  }

  @Get('reports/indicators')
  @Permissions('employee.view')
  getIndicators(@CurrentUser('companyId') companyId: string) {
    return this.service.getIndicators(companyId);
  }

  @Get(':id')
  @Permissions('employee.view')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('employee.update')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('employee.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
