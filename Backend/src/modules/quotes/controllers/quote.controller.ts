import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { QuoteService } from '../services/quote.service';

import { CreateQuoteDto } from '../dto/create-quote.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';
import { QuoteFilterDto } from '../dto/quote-filter.dto';

@ApiTags('Quotes')
@Controller('quotes')
@Module('SALES')
export class QuoteController {
  constructor(private readonly service: QuoteService) {}

  @Post()
  @Permissions('quote.create')
  @ApiOperation({ summary: 'Cadastrar orçamento' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.service.create(companyId, dto, userId);
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
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.service.update(companyId, id, dto, userId);
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

  @Patch(':id/approve')
  @Permissions('quote.approve')
  @ApiOperation({
    summary: 'Aprovar orçamento (gera Pedido de Venda automaticamente)',
  })
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(companyId, id, userId);
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
