import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { ACCESS_TOKEN_COOKIE } from '../constants/cookie.constants';

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

    return {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      status: user.status,
      permissions,
      modules: [...licensedModules.values()],
      company: {
        id: user.company.id,
        code: user.company.code,
        legalName: user.company.legalName,
        tradeName: user.company.tradeName,
      },
    };
  }
}