import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../../core/prisma/prisma.service';

import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { PermissionEffect, Prisma } from '@prisma/client';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from '../constants/token.constants';

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

  /**
   * Include padrão pra montar o contexto completo de autenticação
   * (empresa+plano+módulos, perfis+permissões) que issueTokens()
   * precisa — usado em toda busca de usuário que vai gerar tokens
   * (login, refresh, troca de empresa).
   */
  private readonly authContextInclude = {
    company: {
      include: {
        companyPlan: {
          include: {
            plan: {
              include: {
                planModules: {
                  include: {
                    module: true,
                  },
                },
              },
            },
          },
        },

        companyModules: {
          include: {
            module: true,
          },
        },
      },
    },

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
  } satisfies Prisma.UserInclude;

  private async findUserWithAuthContext(where: Prisma.UserWhereInput) {
    return this.prisma.user.findFirst({
      where,
      include: this.authContextInclude,
    });
  }

  private async findActiveUserByEmail(email: string) {
    return this.findUserWithAuthContext({
      email,
      active: true,
      deletedAt: null,
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

    if (!user.company.active) {
      throw new UnauthorizedException(
        'Empresa inativa. Entre em contato com o suporte.',
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

  private async issueTokens(user: any)
  {
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
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    
      user: {
        id: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    
      company: {
        id: user.company.id,
        code: user.company.code,
        legalName: user.company.legalName,
        tradeName: user.company.tradeName,
        logo: user.company.logo,
        language: user.company.language,
        timezone: user.company.timezone,
        currency: user.company.currency,
      },
    
      permissions: this.buildPermissions(user),
    
      plan: user.company.companyPlan?.plan
        ? {
            id: user.company.companyPlan.plan.id,
            code: user.company.companyPlan.plan.code,
            name: user.company.companyPlan.plan.name,
          }
        : null,
    
      modules: [
        ...(user.company.companyPlan?.plan?.planModules ?? [])
          .filter((item) => item.included)
          .map((item) => ({
            id: item.module.id,
            code: item.module.code,
            name: item.module.name,
            route: item.module.route,
            icon: item.module.icon,
          })),
    
        ...(user.company.companyModules ?? [])
          .filter(
            (item) =>
              item.enabled &&
              item.licensed,
          )
          .map((item) => ({
            id: item.module.id,
            code: item.module.code,
            name: item.module.name,
            route: item.module.route,
            icon: item.module.icon,
          })),
      ],
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);

    return this.issueTokens(user);
  }

  /**
   * Login cruzado: troca a empresa ATIVA da sessão (User.companyId) por
   * outra empresa que este login tem vínculo (UserCompany) — ex.: outra
   * empresa do mesmo grupo. Reemite os tokens (mesmo fluxo do login) já
   * com o novo companyId, sem precisar de senha de novo.
   */
  async switchCompany(userId: string, companyId: string) {
    const link = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!link) {
      throw new ForbiddenException(
        'Você não tem acesso a esta empresa.',
      );
    }

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    if (!company.active) {
      throw new UnauthorizedException(
        'Empresa inativa. Entre em contato com o suporte.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { companyId },
    });

    const user = await this.findUserWithAuthContext({ id: userId });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: { sub: string; type: string };

    // O refresh token agora chega via cookie httpOnly; se o cookie não
    // existir (sessão nunca criada ou já expirada), o valor vem undefined.
    if (!dto?.refreshToken) {
      throw new UnauthorizedException(
        'Sessão não encontrada. Faça login novamente.',
      );
    }

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

    const user = await this.findUserWithAuthContext({
      id: payload.sub,
      active: true,
      deletedAt: null,
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

  /**
   * Usado pelo endpoint público de logout: tenta identificar o usuário
   * pelo access token para revogar o refresh token no banco. Se o token
   * estiver inválido/expirado, apenas ignora — os cookies já terão sido
   * limpos pelo controller.
   */
  async logoutByAccessToken(accessToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(
        accessToken,
      );

      if (payload?.sub) {
        await this.logout(payload.sub);
      }
    } catch {
      // Token inválido: não há sessão a revogar.
    }
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
