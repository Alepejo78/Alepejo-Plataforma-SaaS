import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { InvoiceImportService } from '../services/invoice-import.service';

import { ConfirmPurchaseImportDto } from '../dto/confirm-purchase-import.dto';
import { ConfirmSaleImportDto } from '../dto/confirm-sale-import.dto';
import { ConfirmExpenseImportDto } from '../dto/confirm-expense-import.dto';

/**
 * Importação de nota fiscal (XML de NF-e/NFS-e) pros lados de Compras
 * e Vendas — cria um Pedido de Compra/Venda já recebido/aprovado, ou
 * lança direto em Contas a Pagar/Receber sem estoque nenhum (despesa
 * de serviço: água, luz, telefone, internet...).
 *
 * Não existe rota de "listar"/"buscar" aqui — é só um atalho de
 * lançamento, os documentos criados aparecem nas telas de Compras,
 * Vendas e Financeiro normalmente. Por isso reaproveita as permissões
 * de quem os cria (`purchase.create`, `sale.create`) em vez de ter
 * permissão própria — não entra linha nova na matriz de perfis.
 *
 * `payable-expense`/`receivable-expense` são o mesmo lançamento de
 * `purchase-expense`/`sale-expense` (chamam o mesmo service), só que
 * abertos pela tela de Financeiro — exigem `financial-entry.create`
 * (módulo FINANCE) em vez de `purchase.create`/`sale.create` (módulo
 * Compras/Vendas), pra quem não tem esses módulos licenciados
 * conseguir importar a nota direto em Contas a Pagar/Receber mesmo
 * assim.
 */
@ApiTags('Invoice Import')
@Controller('invoice-import')
export class InvoiceImportController {
  constructor(
    private readonly service: InvoiceImportService,
  ) {}

  @Post('parse')
  @Module('PURCHASE')
  @Permissions('purchase.create')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Lê um XML de NF-e/NFS-e sem gravar nada',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  parse(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @Body('direction') direction?: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Envie o arquivo XML da nota.',
      );
    }

    return this.service.parseXml(
      file.buffer,
      rootCompanyId,
      direction === 'SALE' ? 'SALE' : 'PURCHASE',
    );
  }

  @Post('purchase')
  @Module('PURCHASE')
  @Permissions('purchase.create')
  @ApiOperation({
    summary: 'Confirma a importação criando um Pedido de Compra',
  })
  confirmPurchase(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmPurchaseImportDto,
  ) {
    return this.service.confirmPurchase(
      companyId,
      rootCompanyId,
      dto,
      userId,
    );
  }

  @Post('purchase-expense')
  @Module('PURCHASE')
  @Permissions('purchase.create')
  @ApiOperation({
    summary:
      'Confirma a importação lançando direto em Contas a Pagar, sem estoque',
  })
  confirmPurchaseExpense(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmExpenseImportDto,
  ) {
    return this.service.confirmPurchaseExpense(
      companyId,
      rootCompanyId,
      dto,
      userId,
    );
  }

  @Post('sale')
  @Module('SALES')
  @Permissions('sale.create')
  @ApiOperation({
    summary: 'Confirma a importação criando uma Venda',
  })
  confirmSale(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmSaleImportDto,
  ) {
    return this.service.confirmSale(
      companyId,
      rootCompanyId,
      dto,
      userId,
    );
  }

  @Post('sale-expense')
  @Module('SALES')
  @Permissions('sale.create')
  @ApiOperation({
    summary:
      'Confirma a importação lançando direto em Contas a Receber, sem estoque',
  })
  confirmSaleExpense(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmExpenseImportDto,
  ) {
    return this.service.confirmSaleExpense(
      companyId,
      rootCompanyId,
      dto,
      userId,
    );
  }

  @Post('payable-expense')
  @Module('FINANCE')
  @Permissions('financial-entry.create')
  @ApiOperation({
    summary:
      'Confirma a importação lançando direto em Contas a Pagar — rota do Financeiro, sem depender do módulo Compras',
  })
  confirmPayableExpense(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmExpenseImportDto,
  ) {
    return this.service.confirmPurchaseExpense(
      companyId,
      rootCompanyId,
      dto,
      userId,
    );
  }

  @Post('receivable-expense')
  @Module('FINANCE')
  @Permissions('financial-entry.create')
  @ApiOperation({
    summary:
      'Confirma a importação lançando direto em Contas a Receber — rota do Financeiro, sem depender do módulo Vendas',
  })
  confirmReceivableExpense(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmExpenseImportDto,
  ) {
    return this.service.confirmSaleExpense(
      companyId,
      rootCompanyId,
      dto,
      userId,
    );
  }
}
