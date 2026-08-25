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
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { BusinessPartnersService } from '../services/business-partners.service';

import { CreateBusinessPartnerDto } from '../dto/create-business-partner.dto';
import { UpdateBusinessPartnerDto } from '../dto/update-business-partner.dto';
import { BusinessPartnerFilterDto } from '../dto/business-partner-filter.dto';

/** Cadastro de grupo ("Interprise") — companyId aqui é sempre a raiz do grupo (rootCompanyId), ver WarehouseController. */
@ApiTags('Business Partners')
@Controller('business-partners')
@Module('BPS')
export class BusinessPartnersController {
  constructor(
    private readonly service: BusinessPartnersService,
  ) {}

  @Post()
  @Permissions('partner.create')
  @ApiOperation({
    summary: 'Cadastrar parceiro (cliente/fornecedor/etc.)',
  })
  create(
    @CurrentUser('rootCompanyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBusinessPartnerDto,
  ) {
    return this.service.create(companyId, dto, userId);
  }

  @Get()
  @Permissions('partner.view')
  @ApiOperation({
    summary: 'Listar parceiros (filtro opcional por papel)',
  })
  findAll(
    @CurrentUser('rootCompanyId') companyId: string,
    @Query() filter: BusinessPartnerFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('partner.view')
  @ApiOperation({ summary: 'Buscar parceiro' })
  findOne(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('partner.update')
  @ApiOperation({ summary: 'Alterar parceiro' })
  update(
    @CurrentUser('rootCompanyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessPartnerDto,
  ) {
    return this.service.update(companyId, id, dto, userId);
  }

  @Delete(':id')
  @Permissions('partner.delete')
  @ApiOperation({ summary: 'Excluir parceiro' })
  remove(
    @CurrentUser('rootCompanyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
