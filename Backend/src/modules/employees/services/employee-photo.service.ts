import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extname, join } from 'path';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { dataPath } from '../../../core/storage/data-dir';

export const EMPLOYEE_PHOTO_UPLOAD_ROOT = dataPath(
  'uploads',
  'employees',
);

/**
 * Foto do colaborador (frente "Interprise") — mesmo padrão de
 * ProfileService (avatar do usuário), adaptado: quem faz upload é o
 * RH gerenciando o cadastro de outra pessoa, não autoatendimento, por
 * isso a pasta é por `employeeId` (vem do param de rota), não de
 * `req.user`, e checa posse (grupo) antes de gravar no banco.
 */
@Injectable()
export class EmployeePhotoService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadPhoto(
    rootCompanyId: string,
    employeeId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        company: {
          OR: [{ id: rootCompanyId }, { rootCompanyId }],
        },
      },
      select: { id: true },
    });

    if (!employee) {
      this.removePhotoFile(employeeId, file.filename);

      throw new NotFoundException(
        'Colaborador não encontrado.',
      );
    }

    const publicPath = `/uploads/employees/${employeeId}/${file.filename}`;

    this.removeOldPhotoFiles(employeeId, file.filename);

    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { photo: publicPath },
      select: { id: true, photo: true },
    });
  }

  private removePhotoFile(employeeId: string, filename: string) {
    try {
      unlinkSync(
        join(EMPLOYEE_PHOTO_UPLOAD_ROOT, employeeId, filename),
      );
    } catch {
      // Nada a limpar — segue pro erro de qualquer forma.
    }
  }

  /** Mesma lógica do avatar do usuário: um novo envio apaga o(s) arquivo(s) antigo(s). */
  private removeOldPhotoFiles(
    employeeId: string,
    keepFilename: string,
  ) {
    const dir = join(EMPLOYEE_PHOTO_UPLOAD_ROOT, employeeId);

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

      try {
        unlinkSync(join(dir, entry));
      } catch {
        // Não bloqueia o upload — o banco já aponta para o novo.
      }
    }
  }
}

/**
 * Pasta de destino: uploads/employees/{employeeId}/. O employeeId vem
 * do param de rota (`:id`), não de `req.user` — quem envia é o RH,
 * não o próprio colaborador.
 */
export function employeePhotoDestination(
  req: { params?: { id?: string } },
  _file: Express.Multer.File,
  callback: (error: Error | null, destination: string) => void,
) {
  const employeeId = req.params?.id;

  if (!employeeId) {
    callback(
      new BadRequestException('Colaborador não identificado.'),
      '',
    );

    return;
  }

  const dir = join(EMPLOYEE_PHOTO_UPLOAD_ROOT, employeeId);

  mkdirSync(dir, { recursive: true });

  callback(null, dir);
}

export function employeePhotoFilename(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) {
  callback(null, `photo-${Date.now()}${extname(file.originalname)}`);
}

export function employeePhotoFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, accept: boolean) => void,
) {
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];

  if (!allowed.includes(file.mimetype)) {
    callback(
      new BadRequestException(
        'Formato inválido. Envie PNG, JPG ou WEBP.',
      ),
      false,
    );

    return;
  }

  callback(null, true);
}
