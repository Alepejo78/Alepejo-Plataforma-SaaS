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

import { FinancialEntryImportService } from '../services/financial-entry-import.service';
import { ConfirmFinancialEntryImportDto } from '../dto/confirm-financial-entry-import.dto';

/** Importação em massa de Títulos financeiros via planilha (.xlsx/.csv) — mesmo padrão 2-fases do invoice-import. */
@ApiTags('Financial Entry Import')
@Controller('financial-entry-import')
export class FinancialEntryImportController {
  constructor(private readonly service: FinancialEntryImportService) {}

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
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Envie a planilha (.xlsx ou .csv).');
    }

    return this.service.parse(
      file.buffer,
      file.originalname,
      file.mimetype,
      companyId,
      rootCompanyId,
    );
  }

  @Post('confirm')
  @Module('FINANCE')
  @Permissions('financial-entry.create')
  @ApiOperation({ summary: 'Grava as linhas validadas (cria ou atualiza)' })
  confirm(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmFinancialEntryImportDto,
  ) {
    return this.service.confirm(companyId, rootCompanyId, dto.rows, userId);
  }
}
