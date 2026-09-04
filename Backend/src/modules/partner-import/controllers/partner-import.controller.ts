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

import { PartnerImportService } from '../services/partner-import.service';
import { ConfirmPartnerImportDto } from '../dto/confirm-partner-import.dto';

/** Importação em massa de Parceiros via planilha (.xlsx/.csv) — mesmo padrão 2-fases do invoice-import. */
@ApiTags('Partner Import')
@Controller('partner-import')
export class PartnerImportController {
  constructor(private readonly service: PartnerImportService) {}

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
  @Module('BPS')
  @Permissions('partner.create')
  @ApiOperation({ summary: 'Grava as linhas validadas (cria ou atualiza)' })
  confirm(
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmPartnerImportDto,
  ) {
    return this.service.confirm(rootCompanyId, dto.rows, userId);
  }
}
