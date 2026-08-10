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

import { BenefitsService } from '../services/benefits.service';

import { CreateBenefitDto } from '../dto/create-benefit.dto';
import { UpdateBenefitDto } from '../dto/update-benefit.dto';
import { BenefitFilterDto } from '../dto/benefit-filter.dto';

@Controller('benefits')
@Module('HR')
export class BenefitsController {
  constructor(private readonly service: BenefitsService) {}

  @Post()
  @Permissions('benefit.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateBenefitDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('benefit.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: BenefitFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('benefit.view')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('benefit.update')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBenefitDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('benefit.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
