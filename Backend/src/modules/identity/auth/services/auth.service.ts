import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../../core/prisma/prisma.service';

import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { PermissionEffect } from '@prisma/client';

const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

function getRefreshSecret(): string {
  return (
    process.env.JWT_REFRESH_SECRET ??
    `${process.env.JWT_SECRET ?? 'alepejo-secret'}-refresh`
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async findActiveUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        active: true,
        deletedAt: null,
      },
      include: {
        company: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private buildPermissions(user: {
    roles: {
      role: {
        permissions: {
          effect: PermissionEffect;
          permission: { code: string };
        }[];
      };
    }[];
  }) {
    return user.roles.flatMap((userRole) =>
      userRole.role.permissions.map((rolePermission) => ({
        code: rolePermission.permission.code,
        effect: rolePermission.effect,
      })),
    );
  }

  async validateUser(dto: LoginDto) {
    const user = await this.findActiveUserByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException(
        'Usuário ou senha inválidos.',
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.',
      );
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedLoginAttempts >= MAX_FAILED_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : failedLoginAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_DURATION_MS)
            : user.lockedUntil,
        },
      });

      throw new UnauthorizedException(
        'Usuário ou senha inválidos.',
      );
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    return user;
  }

  private async issueTokens(user: {
    id: string;
    companyId: string;
    email: string;
    name: string;
    status: string;
  }) {
    const accessTokenPayload = {
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(
      accessTokenPayload,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );

    const refreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
    };

    const refreshToken = await this.jwtService.signAsync(
      refreshTokenPayload,
      {
        secret: getRefreshSecret(),
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      user: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: { sub: string; type: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh Token inválido ou expirado.',
      );
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh Token inválido.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        active: true,
        deletedAt: null,
      },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException(
        'Refresh Token inválido ou expirado.',
      );
    }

    const matches = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!matches) {
      // Possível reuso de um refresh token já invalidado: revoga a sessão.
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });

      throw new UnauthorizedException(
        'Refresh Token inválido ou expirado.',
      );
    }

    // Rotaciona o refresh token a cada uso.
    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return {
      success: true,
      message: 'Logout realizado com sucesso.',
    };
  }
}
