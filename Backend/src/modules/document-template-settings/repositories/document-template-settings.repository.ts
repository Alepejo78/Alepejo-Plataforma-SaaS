import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { UpsertDocumentTemplateSettingsDto } from '../dto/upsert-document-template-settings.dto';

/** Campo em branco = "sem cabeçalho/rodapé extra" — grava `null`, não string vazia. */
function normalize(dto: UpsertDocumentTemplateSettingsDto) {
  const data: Record<string, string | null> = {};

  if (dto.pdfHeader !== undefined) {
    const trimmed = dto.pdfHeader.trim();
    data.pdfHeader = trimmed.length > 0 ? trimmed : null;
  }

  if (dto.pdfFooter !== undefined) {
    const trimmed = dto.pdfFooter.trim();
    data.pdfFooter = trimmed.length > 0 ? trimmed : null;
  }

  return data;
}

@Injectable()
export class DocumentTemplateSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(companyId: string) {
    const existing = await this.prisma.documentTemplateSettings.findUnique({
      where: { companyId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.documentTemplateSettings.create({
      data: { companyId },
    });
  }

  async upsert(companyId: string, dto: UpsertDocumentTemplateSettingsDto) {
    const data = normalize(dto);

    return this.prisma.documentTemplateSettings.upsert({
      where: { companyId },
      update: data,
      create: { companyId, ...data },
    });
  }
}
