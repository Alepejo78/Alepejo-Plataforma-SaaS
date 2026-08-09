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

import { JobFunctionsService } from '../services/job-functions.service';

import { CreateJobFunctionDto } from '../dto/create-job-function.dto';
import { UpdateJobFunctionDto } from '../dto/update-job-function.dto';
import { JobFunctionFilterDto } from '../dto/job-function-filter.dto';

@Controller('job-functions')
@Module('HR')
export class JobFunctionsController {
  constructor(private readonly service: JobFunctionsService) {}

  @Post()
  @Permissions('job-function.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateJobFunctionDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('job-function.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: JobFunctionFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('job-function.view')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('job-function.update')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobFunctionDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('job-function.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
