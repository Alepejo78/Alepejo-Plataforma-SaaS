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

import { SectorsService } from '../services/sectors.service';

import { CreateSectorDto } from '../dto/create-sector.dto';
import { UpdateSectorDto } from '../dto/update-sector.dto';
import { SectorFilterDto } from '../dto/sector-filter.dto';

/** Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz do grupo (rootCompanyId), ver WarehouseController. */
@Controller('sectors')
@Module('HR')
export class SectorsController {
  constructor(private readonly service: SectorsService) {}

  @Post()
  @Permissions('sector.create')
  create(
    @CurrentUser('rootCompanyId') companyId: string,
    @Body() dto: CreateSectorDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('sector.view')
  findAll(
    @CurrentUser('rootCompanyId') companyId: string,
    @Query() filter: SectorFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('sector.view')
  findOne(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('sector.update')
  update(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSectorDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Permissions('sector.delete')
  remove(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
