import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { DocumentTemplateSettingsController } from './controllers/document-template-settings.controller';
import { DocumentTemplateSettingsRepository } from './repositories/document-template-settings.repository';
import { DocumentTemplateSettingsService } from './services/document-template-settings.service';

@Module({
  imports: [PrismaModule],

  controllers: [DocumentTemplateSettingsController],

  providers: [
    DocumentTemplateSettingsRepository,
    DocumentTemplateSettingsService,
  ],

  exports: [DocumentTemplateSettingsService],
})
export class DocumentTemplateSettingsModule {}
