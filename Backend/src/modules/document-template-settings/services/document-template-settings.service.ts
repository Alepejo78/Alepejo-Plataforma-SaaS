import { Injectable } from '@nestjs/common';

import { DocumentTemplateSettingsRepository } from '../repositories/document-template-settings.repository';

import { UpsertDocumentTemplateSettingsDto } from '../dto/upsert-document-template-settings.dto';

@Injectable()
export class DocumentTemplateSettingsService {
  constructor(
    private readonly repository: DocumentTemplateSettingsRepository,
  ) {}

  async getSettings(companyId: string) {
    return this.repository.getOrCreate(companyId);
  }

  async updateSettings(
    companyId: string,
    dto: UpsertDocumentTemplateSettingsDto,
  ) {
    return this.repository.upsert(companyId, dto);
  }
}
