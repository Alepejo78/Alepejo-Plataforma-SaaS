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
import { ERP_MODULES } from '../../identity/auth/constants/permissions.constants';

import { ProductImportService } from '../services/product-import.service';
import { ConfirmProductImportDto } from '../dto/confirm-product-import.dto';

/** Importação em massa de Produtos via planilha (.xlsx/.csv) — mesmo padrão 2-fases do invoice-import. */
@ApiTags('Product Import')
@Controller('product-import')
export class ProductImportController {
  constructor(private readonly service: ProductImportService) {}

  @Post('parse')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Lê a planilha e valida linha a linha, sem gravar' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  parse(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Envie a planilha (.xlsx ou .csv).');
    }

    return this.service.parse(
      file.buffer,
      file.originalname,
      file.mimetype,
      rootCompanyId,
    );
  }

  @Post('confirm')
  @Module(ERP_MODULES.PRODUCTS)
  @Permissions('product.create')
  @ApiOperation({ summary: 'Grava as linhas validadas (cria ou atualiza)' })
  confirm(
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmProductImportDto,
  ) {
    return this.service.confirm(rootCompanyId, dto.rows, userId);
  }
}
