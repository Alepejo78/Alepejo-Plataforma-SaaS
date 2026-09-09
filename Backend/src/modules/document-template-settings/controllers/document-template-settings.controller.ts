import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { DocumentTemplateSettingsService } from '../services/document-template-settings.service';

import { UpsertDocumentTemplateSettingsDto } from '../dto/upsert-document-template-settings.dto';

/** Sem `@Module()` — os PDFs que usam isso (orçamento, holerite, ordem de serviço) já são de módulos diferentes entre si. */
@ApiTags('Document Template Settings')
@Controller('document-template-settings')
export class DocumentTemplateSettingsController {
  constructor(
    private readonly service: DocumentTemplateSettingsService,
  ) {}

  @Get()
  @Permissions('email.manage')
  @ApiOperation({ summary: 'Meu cabeçalho/rodapé de PDF' })
  getMine(@CurrentUser('companyId') companyId: string) {
    return this.service.getSettings(companyId);
  }

  @Put()
  @Permissions('email.manage')
  @ApiOperation({ summary: 'Alterar cabeçalho/rodapé de PDF' })
  updateMine(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpsertDocumentTemplateSettingsDto,
  ) {
    return this.service.updateSettings(companyId, dto);
  }
}
