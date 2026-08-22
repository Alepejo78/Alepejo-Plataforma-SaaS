import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extname, join } from 'path';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { dataPath } from '../../../../core/storage/data-dir';

export const BRANDING_UPLOAD_ROOT = dataPath('uploads', 'branding');

export type BrandingTheme = 'light' | 'dark';

const brandingSelect = {
  systemName: true,
  brandColor: true,
  brandingColorEnabled: true,
  logo: true,
  logoDark: true,
  brandingLogoLightEnabled: true,
  brandingLogoDarkEnabled: true,
  brandingSystemNameEnabled: true,
  brandingThemeToggleEnabled: true,
  sidebarLayout: true,
} as const;

export interface UpdateCompanyBrandingInput {
  systemName?: string;
  brandColor?: string | null;
  colorEnabled?: boolean;
  logoLightEnabled?: boolean;
  logoDarkEnabled?: boolean;
  systemNameEnabled?: boolean;
  themeToggleEnabled?: boolean;
  sidebarLayout?: 'vertical' | 'horizontal';
}

@Injectable()
export class CompanyBrandingService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: brandingSelect,
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return company;
  }

  async updateMine(
    companyId: string,
    dto: UpdateCompanyBrandingInput,
  ) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        systemName: dto.systemName,
        brandColor: dto.brandColor,
        brandingColorEnabled: dto.colorEnabled,
        brandingLogoLightEnabled: dto.logoLightEnabled,
        brandingLogoDarkEnabled: dto.logoDarkEnabled,
        brandingSystemNameEnabled: dto.systemNameEnabled,
        brandingThemeToggleEnabled: dto.themeToggleEnabled,
        sidebarLayout: dto.sidebarLayout,
      },
      select: brandingSelect,
    });
  }

  async uploadLogo(
    companyId: string,
    theme: BrandingTheme,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado.',
      );
    }

    // O multer já grava o arquivo em disco (ver
    // buildBrandingMulterOptions); aqui só persistimos o
    // caminho público relativo em Company.logo/logoDark.
    const publicPath = `/uploads/branding/${companyId}/${file.filename}`;

    this.removeOldLogoFiles(companyId, theme, file.filename);

    return this.prisma.company.update({
      where: { id: companyId },
      data:
        theme === 'dark'
          ? { logoDark: publicPath }
          : { logo: publicPath },
      select: brandingSelect,
    });
  }

  /**
   * Um novo envio substitui o anterior: se a extensão mudou (ex.: era
   * .png e o novo é .jpg), o arquivo antigo do mesmo tema fica órfão
   * em disco — aqui apagamos qualquer `{theme}.*` que não seja o
   * arquivo recém-gravado.
   */
  private removeOldLogoFiles(
    companyId: string,
    theme: BrandingTheme,
    keepFilename: string,
  ) {
    const dir = join(BRANDING_UPLOAD_ROOT, companyId);

    let entries: string[];

    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry === keepFilename) {
        continue;
      }

      if (
        entry === theme ||
        entry.startsWith(`${theme}.`) ||
        entry.startsWith(`${theme}-`)
      ) {
        try {
          unlinkSync(join(dir, entry));
        } catch {
          // Falha ao apagar o arquivo antigo não deve quebrar o
          // upload — o registro no banco já aponta para o novo.
        }
      }
    }
  }
}

/**
 * Pasta de destino: uploads/branding/{companyId}/. Como o companyId
 * só existe depois do JwtAuthGuard rodar, ele é lido de `req.user`
 * (populado pelos guards, que executam antes do interceptor do
 * multer).
 */
export function brandingDestination(
  req: { user?: { companyId?: string } },
  _file: Express.Multer.File,
  callback: (error: Error | null, destination: string) => void,
) {
  const companyId = req.user?.companyId;

  if (!companyId) {
    callback(
      new BadRequestException('Empresa não identificada.'),
      '',
    );

    return;
  }

  const dir = join(BRANDING_UPLOAD_ROOT, companyId);

  mkdirSync(dir, { recursive: true });

  callback(null, dir);
}

export function brandingFilename(
  req: { query?: { theme?: string } },
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) {
  const theme = req.query?.theme === 'dark' ? 'dark' : 'light';

  // O timestamp no nome garante uma URL nova a cada envio — sem
  // isso, o navegador (e o próprio <img> já renderizado) continuam
  // mostrando a imagem antiga porque o caminho não mudou.
  callback(
    null,
    `${theme}-${Date.now()}${extname(file.originalname)}`,
  );
}

export function brandingFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, accept: boolean) => void,
) {
  const allowed = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
  ];

  if (!allowed.includes(file.mimetype)) {
    callback(
      new BadRequestException(
        'Formato inválido. Envie PNG, JPG, WEBP ou SVG.',
      ),
      false,
    );

    return;
  }

  callback(null, true);
}
