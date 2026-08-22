import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { ACCESS_TOKEN_COOKIE } from '../constants/cookie.constants';
import { LicenseService } from '../../license/services/license.service';

/**
 * Lê o access token do cookie httpOnly (usado pelo frontend).
 * Retorna null quando não há cookie, para que o extrator seguinte
 * (Authorization: Bearer) seja tentado — mantendo Swagger e
 * integrações server-to-server funcionando.
 */
const cookieExtractor = (req: Request): string | null => {
  const token = req?.cookies?.[ACCESS_TOKEN_COOKIE];

  return typeof token === 'string' && token.length > 0
    ? token
    : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET ?? 'alepejo-secret',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        active: true,
        deletedAt: null,
      },
      include: {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Usuário não encontrado.',
      );
    }

    if (!user.company.active) {
      throw new UnauthorizedException(
        'Empresa inativa. Entre em contato com o suporte.',
      );
    }

    const permissions = user.roles.flatMap((userRole) =>
      userRole.role.permissions.map((rolePermission) => ({
        code: rolePermission.permission.code,
        effect: rolePermission.effect,
      })),
    );

    const licensedModules = new Map<
      string,
      {
        code: string;
        name: string;
        trial: boolean;
        expiresAt: Date | null;
      }
    >();

    // Assinatura bloqueada (TRIAL vencido, PAST_DUE sem tolerância,
    // BLOCKED/CANCELLED) esconde tudo do menu, exceto o essencial
    // ("BPS" — cadastros — é o único módulo "básico" que existe de
    // verdade como Module com nome/rota pra mostrar; os outros da
    // lista do LicenseService.hasModule() são só código de guard, sem
    // equivalente de menu). Sem isso, o menu continuaria mostrando
    // tudo clicável pra quem está bloqueado, e cada clique erraria
    // 403 — pior experiência do que simplesmente esconder.
    const blocked = this.licenseService.isSubscriptionBlocked(
      user.company.companyPlan,
    );

    if (!blocked) {
      if (user.company.companyPlan?.plan?.planModules) {
        for (const item of user.company.companyPlan.plan.planModules) {
          licensedModules.set(item.module.code, {
            code: item.module.code,
            name: item.module.name,
            trial: false,
            expiresAt: null,
          });
        }
      }

      if (user.company.companyModules) {
        for (const item of user.company.companyModules) {
          if (!item.enabled || !item.licensed) {
            continue;
          }

          licensedModules.set(item.module.code, {
            code: item.module.code,
            name: item.module.name,
            trial: item.trial,
            expiresAt: item.expiresAt,
          });
        }
      }
    } else {
      const bps = user.company.companyPlan?.plan?.planModules?.find(
        (item) => item.module.code === 'BPS',
      )?.module;

      if (bps) {
        licensedModules.set('BPS', {
          code: bps.code,
          name: bps.name,
          trial: false,
          expiresAt: null,
        });
      }
    }

    return {
      id: user.id,
      companyId: user.companyId,
      // Raiz do grupo (empresas ligadas por Company.rootCompanyId) —
      // dono físico dos cadastros compartilhados do grupo (ver
      // docs/08-Continuidade.md, frente "Interprise"). Recalculado a
      // cada request, nunca guardado no JWT, mesmo padrão de
      // companyId — evita ficar stale se a topologia do grupo mudar.
      rootCompanyId: user.company.rootCompanyId ?? user.company.id,
      email: user.email,
      name: user.name,
      status: user.status,
      avatar: user.avatar,
      avatarEnabled: user.avatarEnabled,
      permissions,
      modules: [...licensedModules.values()],
      company: {
        id: user.company.id,
        code: user.company.code,
        slug: user.company.slug,
        legalName: user.company.legalName,
        tradeName: user.company.tradeName,
        logo: user.company.logo,
        logoDark: user.company.logoDark,
        systemName: user.company.systemName,
        brandColor: user.company.brandColor,
        brandingColorEnabled: user.company.brandingColorEnabled,
        brandingLogoLightEnabled:
          user.company.brandingLogoLightEnabled,
        brandingLogoDarkEnabled:
          user.company.brandingLogoDarkEnabled,
        brandingSystemNameEnabled:
          user.company.brandingSystemNameEnabled,
        brandingThemeToggleEnabled:
          user.company.brandingThemeToggleEnabled,
        sidebarLayout: user.company.sidebarLayout,
      },
    };
  }
}