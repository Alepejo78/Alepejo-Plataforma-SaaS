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
import { Public } from '../../../core/decorators/public.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { PpeDeliveriesService } from '../services/ppe-deliveries.service';

import { CreatePpeDeliveryDto } from '../dto/create-ppe-delivery.dto';
import { PpeDeliveryFilterDto } from '../dto/ppe-delivery-filter.dto';

@Controller('ppe-deliveries')
@Module('HR')
export class PpeDeliveriesController {
  constructor(private readonly service: PpeDeliveriesService) {}

  @Post()
  @Permissions('ppe-delivery.create')
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreatePpeDeliveryDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Permissions('ppe-delivery.view')
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: PpeDeliveryFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  /**
   * Rotas públicas (sem login) — o colaborador confirma o recebimento
   * pelo link enviado por e-mail/WhatsApp. Precisam vir ANTES de
   * `:id`/`:id/...` só por organização; não colidem de verdade porque
   * `public/:id` tem dois segmentos e `:id` só um.
   */
  @Public()
  @Get('public/:id')
  getPublicInfo(
    @Param('id') id: string,
    @Query('token') token: string,
  ) {
    return this.service.getPublicInfo(id, token);
  }

  @Public()
  @Post('public/:id/confirm')
  confirmPublic(
    @Param('id') id: string,
    @Query('token') token: string,
  ) {
    return this.service.confirmPublic(id, token);
  }

  @Get(':id')
  @Permissions('ppe-delivery.view')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id/confirm')
  @Permissions('ppe-delivery.approve')
  confirm(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.confirm(companyId, id, userId);
  }

  @Post(':id/send-confirmation')
  @Permissions('ppe-delivery.approve')
  sendConfirmation(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.sendConfirmation(companyId, id);
  }

  @Delete(':id')
  @Permissions('ppe-delivery.delete')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
