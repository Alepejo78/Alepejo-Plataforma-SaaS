import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../../core/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Module } from '../../license/decorators/module.decorator';

import {
  CompanyBrandingService,
  brandingDestination,
  brandingFileFilter,
  brandingFilename,
  type BrandingTheme,
} from '../services/company-branding.service';

import { UpdateCompanyBrandingDto } from '../dto/update-company-branding.dto';

/**
 * Personalização de marca (logo clara/escura, nome do sistema).
 * Módulo licenciável opcional: sem ele, a empresa fica no padrão
 * AlePejo e sem acesso ao alternador de tema (ver frontend).
 */
@ApiTags('Identity - Company Branding')
@Controller('companies/me/branding')
@Module('BRANDING')
export class CompanyBrandingController {
  constructor(
    private readonly service: CompanyBrandingService,
  ) {}

  @Get()
  @Permissions('company-branding.view')
  @ApiOperation({ summary: 'Minha personalização de marca' })
  getMine(@CurrentUser('companyId') companyId: string) {
    return this.service.getMine(companyId);
  }

  @Patch()
  @Permissions('company-branding.update')
  @ApiOperation({ summary: 'Atualizar nome do sistema' })
  updateMine(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateCompanyBrandingDto,
  ) {
    return this.service.updateMine(companyId, dto);
  }

  @Post('logo')
  @Permissions('company-branding.update')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Enviar logo (tema claro ou escuro)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: brandingDestination,
        filename: brandingFilename,
      }),
      fileFilter: brandingFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadLogo(
    @CurrentUser('companyId') companyId: string,
    @Query('theme') theme: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (theme !== 'light' && theme !== 'dark') {
      throw new BadRequestException(
        'Informe o tema: "light" ou "dark".',
      );
    }

    return this.service.uploadLogo(
      companyId,
      theme as BrandingTheme,
      file,
    );
  }
}
