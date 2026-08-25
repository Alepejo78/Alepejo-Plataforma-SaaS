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
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { QuotationService } from '../services/quotation.service';

import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import { QuotationFilterDto } from '../dto/quotation-filter.dto';
import { CreateQuotationOfferDto } from '../dto/create-quotation-offer.dto';

@ApiTags('Quotations')
@Controller('quotations')
@Module('PURCHASE')
export class QuotationController {
  constructor(private readonly service: QuotationService) {}

  @Post()
  @Permissions('quotation.create')
  @ApiOperation({ summary: 'Cadastrar cotação' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.service.create(companyId, dto, userId);
  }

  @Get()
  @Permissions('quotation.view')
  @ApiOperation({ summary: 'Listar cotações' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() filter: QuotationFilterDto,
  ) {
    return this.service.findAll(companyId, filter);
  }

  @Get(':id')
  @Permissions('quotation.view')
  @ApiOperation({ summary: 'Buscar cotação' })
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Permissions('quotation.update')
  @ApiOperation({ summary: 'Alterar cotação' })
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.service.update(companyId, id, dto, userId);
  }

  @Patch(':id/cancel')
  @Permissions('quotation.cancel')
  @ApiOperation({ summary: 'Cancelar cotação' })
  cancel(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(companyId, id, userId);
  }

  @Post(':id/offers')
  @Permissions('quotation.update')
  @ApiOperation({
    summary: 'Adicionar proposta de fornecedor (máx. 3 por cotação)',
  })
  addOffer(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateQuotationOfferDto,
  ) {
    return this.service.addOffer(companyId, id, dto, userId);
  }

  @Delete(':id/offers/:offerId')
  @Permissions('quotation.update')
  @ApiOperation({ summary: 'Remover proposta de fornecedor' })
  async removeOffer(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Param('offerId') offerId: string,
  ) {
    await this.service.removeOffer(companyId, id, offerId);

    return { success: true };
  }

  @Patch(':id/offers/:offerId/choose')
  @Permissions('quotation.decide')
  @ApiOperation({
    summary: 'Escolher o fornecedor vencedor da cotação',
  })
  chooseWinner(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('offerId') offerId: string,
  ) {
    return this.service.chooseWinner(companyId, id, offerId, userId);
  }

  @Patch(':id/undo-winner')
  @Permissions('quotation.decide')
  @ApiOperation({
    summary: 'Estornar a escolha da vencedora, voltando a cotação para rascunho',
  })
  undoWinner(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.undoWinner(companyId, id, userId);
  }
}
