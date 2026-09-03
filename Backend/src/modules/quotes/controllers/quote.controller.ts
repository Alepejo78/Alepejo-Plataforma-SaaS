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

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Public } from '../../../core/decorators/public.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { QuoteService } from '../services/quote.service';
import { QuoteConfirmationService } from '../services/quote-confirmation.service';

import { CreateQuoteDto } from '../dto/create-quote.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';
import { QuoteFilterDto } from '../dto/quote-filter.dto';
import { PublicApproveQuoteDto } from '../dto/public-approve-quote.dto';
import { PublicRequestRevisionDto } from '../dto/public-request-revision.dto';
import { PublicCancelQuoteDto } from '../dto/public-cancel-quote.dto';

@ApiTags('Quotes')
@Controller('quotes')
@Module('SALES')
export class QuoteController {
  constructor(
    private readonly service: QuoteService,
    private readonly confirmationService: QuoteConfirmationService,
  ) {}

  /** Rotas públicas (sem login) — precisam vir antes de `:id`. */
  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Resumo do orçamento para o cliente decidir (link público)' })
  getPublicInfo(@Param('id') id: string, @Query('token') token: string) {
    return this.confirmationService.getPublicInfo(id, token);
  }

  @Public()
  @Post('public/:id/approve')
  @ApiOperation({ summary: 'Cliente aprova o orçamento (link público)' })
  approvePublic(
    @Param('id') id: string,
    @Query('token') token: string,
    @Body() dto: PublicApproveQuoteDto,
  ) {
    return this.confirmationService.approvePublic(id, token, dto);
  }

  @Public()
  @Post('public/:id/request-revision')
  @ApiOperation({ summary: 'Cliente pede revisão do orçamento (link público)' })
  requestRevisionPublic(
    @Param('id') id: string,
    @Query('token') token: string,
    @Body() dto: PublicRequestRevisionDto,
  ) {
    return this.confirmationService.requestRevisionPublic(id, token, dto);
  }

  @Public()
  @Post('public/:id/cancel')
  @ApiOperation({ summary: 'Cliente cancela o orçamento (link público)' })
  cancelPublic(
    @Param('id') id: string,
    @Query('token') token: string,
    @Body() dto: PublicCancelQuoteDto,
  ) {
    return this.confirmationService.cancelPublic(id, token, dto);
  }

  @Post(':id/send-confirmation')
  @Permissions('quote.send-confirmation')
  @ApiOperation({ summary: 'Enviar link de aprovação ao cliente por e-mail/WhatsApp' })
  sendConfirmation(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.confirmationService.sendConfirmation(companyId, id);
  }

  @Post()
  @Permissions('quote.create')
  @ApiOperation({ summary: 'Cadastrar orçamento' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.service.create(companyId, rootCompanyId, dto, userId);
  }

  @Get()
  @Permissions('quote.view')
  @ApiOperation({ summary: 'Listar orçamentos' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: QuoteFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('quote.view')
  @ApiOperation({ summary: 'Buscar orçamento' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('quote.update')
  @ApiOperation({ summary: 'Alterar orçamento' })
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.service.update(companyId, rootCompanyId, id, dto, userId);
  }

  @Patch(':id/cancel')
  @Permissions('quote.cancel')
  @ApiOperation({ summary: 'Cancelar orçamento' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id, userId);
  }

  @Delete(':id')
  @Permissions('quote.delete')
  @ApiOperation({ summary: 'Excluir orçamento cancelado' })
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }

  @Patch(':id/approve')
  @Permissions('quote.approve')
  @ApiOperation({
    summary: 'Aprovar orçamento (gera Pedido de Venda automaticamente)',
  })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(companyId, rootCompanyId, id, userId);
  }

  @Patch(':id/undo-approval')
  @Permissions('quote.approve')
  @ApiOperation({
    summary:
      'Estornar aprovação (apaga o Pedido de Venda gerado e volta para rascunho)',
  })
  undoApproval(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.undoApproval(companyId, id, userId);
  }
}
