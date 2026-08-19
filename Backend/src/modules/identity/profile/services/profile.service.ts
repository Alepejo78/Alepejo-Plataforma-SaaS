import { BadRequestException, Injectable } from '@nestjs/common';
import { extname, join } from 'path';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { dataPath } from '../../../../core/storage/data-dir';

export const AVATAR_UPLOAD_ROOT = dataPath('uploads', 'avatars');

const avatarSelect = {
  avatar: true,
  avatarEnabled: true,
} as const;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: avatarSelect,
    });
  }

  async setEnabled(userId: string, enabled: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarEnabled: enabled },
      select: avatarSelect,
    });
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado.',
      );
    }

    const publicPath = `/uploads/avatars/${userId}/${file.filename}`;

    this.removeOldAvatarFiles(userId, file.filename);

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar: publicPath },
      select: avatarSelect,
    });
  }

  /** Mesma lógica da logo: um novo envio apaga o(s) arquivo(s) antigo(s). */
  private removeOldAvatarFiles(
    userId: string,
    keepFilename: string,
  ) {
    const dir = join(AVATAR_UPLOAD_ROOT, userId);

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
 * Pasta de destino: uploads/avatars/{userId}/. O userId vem de
 * `req.user` (populado pelo JwtAuthGuard, que roda antes do
 * interceptor do multer).
 */
export function avatarDestination(
  req: { user?: { id?: string } },
  _file: Express.Multer.File,
  callback: (error: Error | null, destination: string) => void,
) {
  const userId = req.user?.id;

  if (!userId) {
    callback(
      new BadRequestException('Usuário não identificado.'),
      '',
    );

    return;
  }

  const dir = join(AVATAR_UPLOAD_ROOT, userId);

  mkdirSync(dir, { recursive: true });

  callback(null, dir);
}

export function avatarFilename(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) {
  // Timestamp no nome: cada envio vira uma URL nova, senão o
  // navegador (e o <img> já renderizado) continuam mostrando a
  // foto antiga porque o caminho não mudou.
  callback(null, `avatar-${Date.now()}${extname(file.originalname)}`);
}

export function avatarFileFilter(
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
