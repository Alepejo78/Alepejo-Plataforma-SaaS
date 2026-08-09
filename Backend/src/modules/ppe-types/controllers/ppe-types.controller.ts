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

import { PpeTypesService } from '../services/ppe-types.service';

import { CreatePpeTypeDto } from '../dto/create-ppe-type.dto';
import { UpdatePpeTypeDto } from '../dto/update-ppe-type.dto';
import { PpeTypeFilterDto } from '../dto/ppe-type-filter.dto';

@Controller('ppe-types')
@Module('HR')
export class PpeTypesController {
  constructor(private readonly service: PpeTypesService) {}

  @Post()
  @Permissions('ppe-type.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreatePpeTypeDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('ppe-type.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: PpeTypeFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('ppe-type.view')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('ppe-type.update')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePpeTypeDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('ppe-type.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
