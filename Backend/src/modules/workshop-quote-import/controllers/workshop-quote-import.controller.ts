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

import { WorkshopQuoteImportService } from '../services/workshop-quote-import.service';
import { ConfirmWorkshopQuoteImportDto } from '../dto/confirm-workshop-quote-import.dto';

/**
 * Importação do orçamento (PDF) do sistema de gestão de oficina —
 * lança direto em Contas a Receber, um título por item (peça e
 * serviço), cadastrando cliente e produto/serviço automaticamente
 * quando não existirem ainda. Ver `WorkshopQuoteImportService`.
 */
@ApiTags('Workshop Quote Import')
@Controller('workshop-quote-import')
export class WorkshopQuoteImportController {
  constructor(private readonly service: WorkshopQuoteImportService) {}

  /// Sem `@Permissions` de propósito — só lê e devolve pra revisão,
  /// não grava nada (mesmo raciocínio do invoice-import).
  @Post('parse')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Lê o PDF do orçamento sem gravar nada' })
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
      throw new BadRequestException('Envie o PDF do orçamento.');
    }

    return this.service.parseFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      rootCompanyId,
    );
  }

  @Post('confirm')
  @Module('FINANCE')
  @Permissions('financial-entry.create')
  @ApiOperation({
    summary:
      'Confirma a importação — cria os títulos a receber (um por item)',
  })
  confirm(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmWorkshopQuoteImportDto,
  ) {
    return this.service.confirm(companyId, rootCompanyId, dto, userId);
  }
}
