import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { PassportStrategy } from "@nestjs/passport";
import {
  ExtractJwt,
  Strategy,
} from "passport-jwt";

import { PrismaService } from "../../../../core/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
) {
  constructor(
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        process.env.JWT_SECRET ??
        "alepejo-secret",

      passReqToCallback: false,
    });

    console.log("");
    console.log(
      "========================================",
    );
    console.log(
      "JWT_SECRET:",
      process.env.JWT_SECRET ??
        "alepejo-secret",
    );
    console.log(
      "========================================",
    );
    console.log("");
  }

  async validate(payload: any) {
    console.log("");
    console.log(
      "========== JWT VALIDATE ==========",
    );
    console.log(payload);
    console.log("");

    const user =
      await this.prisma.user.findFirst({
        where: {
          id: payload.sub,
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

    if (!user) {
      console.log(
        "USUÁRIO NÃO ENCONTRADO",
      );

      throw new UnauthorizedException(
        "Usuário não encontrado.",
      );
    }

    const permissions =
      user.roles.flatMap((userRole) =>
        userRole.role.permissions
          .filter(
            (rolePermission) =>
              rolePermission.effect ===
              "ALLOW",
          )
          .map(
            (rolePermission) =>
              rolePermission.permission.code,
          ),
      );

    console.log("USER:");
    console.log(user.email);

    console.log("PERMISSIONS:");
    console.log(permissions);

    return {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      status: user.status,
      permissions,
    };
  }
}