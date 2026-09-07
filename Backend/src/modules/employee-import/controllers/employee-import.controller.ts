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

import { EmployeeImportService } from '../services/employee-import.service';
import { ConfirmEmployeeImportDto } from '../dto/confirm-employee-import.dto';

/** Importação em massa de Colaboradores via planilha (.xlsx/.csv) — mesmo padrão 2-fases do partner-import. */
@ApiTags('Employee Import')
@Controller('employee-import')
export class EmployeeImportController {
  constructor(private readonly service: EmployeeImportService) {}

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
  ) {
    if (!file) {
      throw new BadRequestException('Envie a planilha (.xlsx ou .csv).');
    }

    return this.service.parse(
      file.buffer,
      file.originalname,
      file.mimetype,
      companyId,
    );
  }

  @Post('confirm')
  @Module('HR')
  @Permissions('employee.import')
  @ApiOperation({ summary: 'Grava as linhas validadas (cria ou atualiza)' })
  confirm(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('rootCompanyId') rootCompanyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmEmployeeImportDto,
  ) {
    return this.service.confirm(companyId, rootCompanyId, dto.rows, userId);
  }
}
