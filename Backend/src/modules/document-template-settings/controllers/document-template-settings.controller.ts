import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import {
  DocumentTemplateSettingsService,
  templateImageDestination,
  templateImageFileFilter,
  templateImageFilename,
} from '../services/document-template-settings.service';

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

  @Post('template-image')
  @Permissions('email.manage')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Enviar template completo (imagem de fundo com cabeçalho + rodapé)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: templateImageDestination,
        filename: templateImageFilename,
      }),
      fileFilter: templateImageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadTemplateImage(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadTemplateImage(companyId, file);
  }

  @Delete('template-image')
  @Permissions('email.manage')
  @ApiOperation({ summary: 'Remover o template completo' })
  removeTemplateImage(@CurrentUser('companyId') companyId: string) {
    return this.service.removeTemplateImage(companyId);
  }
}
