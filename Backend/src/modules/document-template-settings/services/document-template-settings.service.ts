import { BadRequestException, Injectable } from '@nestjs/common';
import { extname, join } from 'path';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';

import { dataPath } from '../../../core/storage/data-dir';

import { DocumentTemplateSettingsRepository } from '../repositories/document-template-settings.repository';

import { UpsertDocumentTemplateSettingsDto } from '../dto/upsert-document-template-settings.dto';

export const TEMPLATE_IMAGE_UPLOAD_ROOT = dataPath(
  'uploads',
  'document-template',
);

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

  async uploadTemplateImage(
    companyId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    // O multer já grava o arquivo em disco (ver
    // templateImageDestination/templateImageFilename) — aqui só
    // persistimos o caminho público relativo.
    const publicPath = `/uploads/document-template/${companyId}/${file.filename}`;

    this.removeOldTemplateFiles(companyId, file.filename);

    return this.repository.setTemplateImagePath(companyId, publicPath);
  }

  async removeTemplateImage(companyId: string) {
    this.removeOldTemplateFiles(companyId, null);

    return this.repository.setTemplateImagePath(companyId, null);
  }

  /** Um novo envio substitui o anterior — apaga qualquer arquivo antigo da pasta da empresa que não seja o recém-gravado (`keepFilename` null = apaga tudo, usado ao remover). */
  private removeOldTemplateFiles(
    companyId: string,
    keepFilename: string | null,
  ) {
    const dir = join(TEMPLATE_IMAGE_UPLOAD_ROOT, companyId);

    let entries: string[];

    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (keepFilename && entry === keepFilename) {
        continue;
      }

      try {
        unlinkSync(join(dir, entry));
      } catch {
        // Falha ao apagar o arquivo antigo não deve quebrar o
        // upload/remoção — o registro no banco já reflete o estado novo.
      }
    }
  }
}

/**
 * Pasta de destino: uploads/document-template/{companyId}/. Como o
 * companyId só existe depois do JwtAuthGuard rodar, ele é lido de
 * `req.user` (populado pelos guards, que executam antes do
 * interceptor do multer) — mesmo padrão de company-branding.service.ts.
 */
export function templateImageDestination(
  req: { user?: { companyId?: string } },
  _file: Express.Multer.File,
  callback: (error: Error | null, destination: string) => void,
) {
  const companyId = req.user?.companyId;

  if (!companyId) {
    callback(new BadRequestException('Empresa não identificada.'), '');
    return;
  }

  const dir = join(TEMPLATE_IMAGE_UPLOAD_ROOT, companyId);

  mkdirSync(dir, { recursive: true });

  callback(null, dir);
}

export function templateImageFilename(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) {
  // Timestamp no nome garante uma URL nova a cada envio — sem isso, o
  // navegador continua mostrando a imagem antiga porque o caminho não mudou.
  callback(null, `template-${Date.now()}${extname(file.originalname)}`);
}

export function templateImageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, accept: boolean) => void,
) {
  // PDFKit só embute PNG/JPEG direto (ver EMBEDDABLE_LOGO_EXTENSIONS
  // nos *-pdf.service.ts) — sem SVG/WEBP aqui pra nunca aceitar um
  // arquivo que depois silenciosamente não aparece no PDF.
  const allowed = ['image/png', 'image/jpeg'];

  if (!allowed.includes(file.mimetype)) {
    callback(
      new BadRequestException('Formato inválido. Envie PNG ou JPG.'),
      false,
    );
    return;
  }

  callback(null, true);
}
