import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Public } from '../../../core/decorators/public.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';
import { PrismaService } from '../../../core/prisma/prisma.service';

import { ServiceOrderService, serviceOrderNumberOf } from '../services/service-order.service';
import { ServiceOrderConfirmationService } from '../services/service-order-confirmation.service';
import { ServiceOrderPdfService } from '../services/service-order-pdf.service';

import { CreateServiceOrderDto } from '../dto/create-service-order.dto';
import { UpdateServiceOrderDto } from '../dto/update-service-order.dto';
import { ServiceOrderFilterDto } from '../dto/service-order-filter.dto';
import { PublicRequestRevisionServiceOrderDto } from '../dto/public-request-revision-service-order.dto';
import { PublicCancelServiceOrderDto } from '../dto/public-cancel-service-order.dto';

@ApiTags('Service Orders')
@Controller('service-orders')
@Module('SALES')
export class ServiceOrderController {
  constructor(
    private readonly service: ServiceOrderService,
    private readonly confirmationService: ServiceOrderConfirmationService,
    private readonly pdfService: ServiceOrderPdfService,
    private readonly prisma: PrismaService,
  ) {}

  /** Rotas públicas (sem login) — precisam vir antes de `:id`. */
  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Resumo da OS para o cliente confirmar (link público)' })
  getPublicInfo(@Param('id') id: string, @Query('token') token: string) {
    return this.confirmationService.getPublicInfo(id, token);
  }

  @Public()
  @Post('public/:id/confirm')
  @ApiOperation({ summary: 'Cliente confirma a execução do serviço (link público)' })
  confirmPublic(@Param('id') id: string, @Query('token') token: string) {
    return this.confirmationService.confirmPublic(id, token);
  }

  @Public()
  @Post('public/:id/request-revision')
  @ApiOperation({ summary: 'Cliente pede revisão da OS (link público)' })
  requestRevisionPublic(
    @Param('id') id: string,
    @Query('token') token: string,
    @Body() dto: PublicRequestRevisionServiceOrderDto,
  ) {
    return this.confirmationService.requestRevisionPublic(id, token, dto);
  }

  @Public()
  @Post('public/:id/cancel')
  @ApiOperation({ summary: 'Cliente cancela a OS (link público)' })
  cancelPublic(
    @Param('id') id: string,
    @Query('token') token: string,
    @Body() dto: PublicCancelServiceOrderDto,
  ) {
    return this.confirmationService.cancelPublic(id, token, dto);
  }

  @Post()
  @Permissions('service-order.create')
  @ApiOperation({ summary: 'Cadastrar ordem de serviço' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateServiceOrderDto,
  ) {
    return this.service.create(companyId, rootCompanyId, dto, userId);
  }

  @Get()
  @Permissions('service-order.view')
  @ApiOperation({ summary: 'Listar ordens de serviço' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: ServiceOrderFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id/pdf')
  @Permissions('service-order.view')
  @ApiOperation({ summary: 'Baixar PDF da ordem de serviço (formulário impresso)' })
  async downloadPdf(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const order = await this.service.findOne(companyId, id);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const pdf = await this.pdfService.generate(order, company);

    // `@Res()` sem passthrough — resposta enviada direto, sem passar
    // pelo ResponseInterceptor global (que embrulharia o PDF binário
    // num envelope JSON `{success, data}`, corrompendo o arquivo).
    res
      .set('Content-Type', 'application/pdf')
      .set(
        'Content-Disposition',
        `inline; filename="${serviceOrderNumberOf(order)}.pdf"`,
      )
      .send(pdf);
  }

  @Get(':id')
  @Permissions('service-order.view')
  @ApiOperation({ summary: 'Buscar ordem de serviço' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('service-order.update')
  @ApiOperation({ summary: 'Alterar ordem de serviço' })
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.service.update(companyId, rootCompanyId, id, dto, userId);
  }

  @Patch(':id/start-execution')
  @Permissions('service-order.update')
  @ApiOperation({ summary: 'Iniciar execução da ordem de serviço' })
  startExecution(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.startExecution(companyId, id, userId);
  }

  @Patch(':id/complete')
  @Permissions('service-order.update')
  @ApiOperation({ summary: 'Concluir execução da ordem de serviço' })
  complete(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.complete(companyId, id, userId);
  }

  @Post(':id/send-confirmation')
  @Permissions('service-order.send-confirmation')
  @ApiOperation({ summary: 'Enviar link de confirmação ao cliente por e-mail/WhatsApp' })
  sendConfirmation(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.confirmationService.sendConfirmation(companyId, id);
  }

  @Patch(':id/cancel')
  @Permissions('service-order.cancel')
  @ApiOperation({ summary: 'Cancelar ordem de serviço' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id, userId);
  }

  @Delete(':id')
  @Permissions('service-order.delete')
  @ApiOperation({ summary: 'Excluir ordem de serviço cancelada' })
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
