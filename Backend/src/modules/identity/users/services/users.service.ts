import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { PasswordService } from '../../../../core/security/password.service';
import { EmailNotificationsService } from '../../../notifications/services/email-notifications.service';

import { UsersRepository } from '../repositories/users.repository';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

const PASSWORD_RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
// Bloqueio manual não tem prazo — "até alguém desbloquear" — então
// usamos uma data bem no futuro em vez de um campo booleano novo,
// reaproveitando o mesmo `lockedUntil` que o login já respeita.
const MANUAL_BLOCK_UNTIL = new Date('2999-12-31T00:00:00.000Z');

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  async create(companyId: string, createUserDto: CreateUserDto) {
    const userExists = await this.usersRepository.findByEmail(
      createUserDto.email,
    );

    if (userExists) {
      throw new ConflictException(
        'Já existe um usuário cadastrado com este e-mail.',
      );
    }

    const passwordHash = await this.passwordService.hash(
      createUserDto.password,
    );

    const user = await this.usersRepository.create({
      company: {
        connect: {
          id: companyId,
        },
      },
      name: createUserDto.name,
      email: createUserDto.email,
      passwordHash,
      department: createUserDto.department,
      manager: createUserDto.manager,
      alias: createUserDto.alias,
      status: UserStatus.PENDING_ACTIVATION,
      mustChangePassword: true,
      active: true,
    });

    if (createUserDto.roleId) {
      await this.usersRepository.syncRole(
        user.id,
        createUserDto.roleId,
      );
    }

    // Todo usuário nasce com vínculo de login cruzado (UserCompany)
    // pra própria empresa — sem isso, o próprio dono da conta não
    // apareceria no seletor de empresas dele mesmo.
    await this.usersRepository.linkCompany(user.id, companyId);

    if (createUserDto.companyIds) {
      await this.setCompanies(
        companyId,
        user.id,
        createUserDto.companyIds,
      );
    }

    return user;
  }

  async findAll(companyId: string) {
    return this.usersRepository.findAll(companyId);
  }

  async findById(companyId: string, id: string) {
    const user = await this.usersRepository.findById(companyId, id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  // Usado apenas internamente pelo AuthService (login/refresh),
  // deliberadamente não escopado por companyId.
  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async update(
    companyId: string,
    id: string,
    updateUserDto: UpdateUserDto,
  ) {
    await this.findById(companyId, id);

    // roleId/companyIds não são colunas de User (viram vínculos à
    // parte); password aqui é ignorado de propósito — troca de senha
    // sempre passa pelo fluxo de redefinição por e-mail
    // (requestPasswordReset / setPasswordWithToken), nunca por este
    // PATCH genérico.
    const { roleId, password, companyIds, ...rest } = updateUserDto;

    const updated = await this.usersRepository.update(id, rest);

    if (roleId !== undefined) {
      await this.usersRepository.syncRole(id, roleId);
    }

    if (companyIds !== undefined) {
      await this.setCompanies(companyId, id, companyIds);
    }

    return updated;
  }

  /**
   * Define as empresas do MESMO GRUPO de `actingCompanyId` que este
   * usuário também pode acessar (login cruzado, ver
   * AuthService.switchCompany) — a empresa dona do cadastro sempre
   * fica incluída, mesmo que não venha na lista. Empresa nova marcada
   * ganha a Role "Administrador" (code ADMIN) de lá, só se o usuário
   * ainda não tiver nenhuma role nessa empresa (não sobrescreve um
   * vínculo mais específico já existente). Desmarcar só remove o
   * acesso (UserCompany) — não mexe nas roles já concedidas lá.
   */
  private async setCompanies(
    actingCompanyId: string,
    userId: string,
    companyIds: string[],
  ) {
    const actingCompany = await this.prisma.company.findFirst({
      where: { id: actingCompanyId, deletedAt: null },
    });

    if (!actingCompany) {
      return;
    }

    const rootCompanyId =
      actingCompany.rootCompanyId ?? actingCompany.id;

    const groupCompanies = await this.prisma.company.findMany({
      where: {
        deletedAt: null,
        OR: [{ id: rootCompanyId }, { rootCompanyId }],
      },
      select: { id: true },
    });

    const groupIds = new Set(groupCompanies.map((c) => c.id));

    const targetUser = await this.usersRepository.findByIdUnscoped(
      userId,
    );

    if (!targetUser) {
      return;
    }

    const desired = new Set(
      companyIds.filter((id) => groupIds.has(id)),
    );
    desired.add(targetUser.companyId);

    const current = await this.prisma.userCompany.findMany({
      where: { userId },
      select: { companyId: true },
    });

    const currentIds = new Set(current.map((c) => c.companyId));

    const toAdd = [...desired].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter(
      (id) => !desired.has(id),
    );

    for (const companyId of toAdd) {
      await this.prisma.userCompany.upsert({
        where: { userId_companyId: { userId, companyId } },
        create: { userId, companyId },
        update: {},
      });

      const hasRoleThere = await this.prisma.userRole.findFirst({
        where: { userId, role: { companyId } },
      });

      if (!hasRoleThere) {
        const adminRole = await this.prisma.role.findFirst({
          where: { companyId, code: 'ADMIN', deletedAt: null },
        });

        if (adminRole) {
          await this.prisma.userRole.create({
            data: { userId, roleId: adminRole.id },
          });
        }
      }
    }

    if (toRemove.length > 0) {
      await this.prisma.userCompany.deleteMany({
        where: { userId, companyId: { in: toRemove } },
      });
    }
  }

  async updateLoginSuccess(id: string) {
    return this.usersRepository.update(id, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  async updateFailedLogin(id: string, attempts: number) {
    return this.usersRepository.update(id, {
      failedLoginAttempts: attempts,
    });
  }

  async activate(companyId: string, id: string) {
    await this.findById(companyId, id);

    return this.usersRepository.update(id, {
      active: true,
    });
  }

  async deactivate(companyId: string, id: string) {
    await this.findById(companyId, id);

    return this.usersRepository.update(id, {
      active: false,
    });
  }

  async block(companyId: string, id: string) {
    await this.findById(companyId, id);

    return this.usersRepository.update(id, {
      lockedUntil: MANUAL_BLOCK_UNTIL,
    });
  }

  async unblock(companyId: string, id: string) {
    await this.findById(companyId, id);

    return this.usersRepository.update(id, {
      lockedUntil: null,
      failedLoginAttempts: 0,
    });
  }

  /**
   * Dispara e-mail com link pra o usuário definir a própria senha
   * (usuário novo, ou "Alterar Senha" na lista). Best-effort: o envio
   * nunca lança, mesmo padrão de EmailNotificationsService.send.
   */
  async requestPasswordReset(companyId: string, id: string) {
    const user = await this.findById(companyId, id);

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await this.passwordService.hash(token);

    await this.usersRepository.update(user.id, {
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: new Date(
        Date.now() + PASSWORD_RESET_TOKEN_TTL_MS,
      ),
    });

    const frontendUrl =
      process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/definir-senha?userId=${user.id}&token=${token}`;

    void this.emailNotifications.send(
      companyId,
      user.email,
      'Defina sua senha de acesso — AlePejo ERP',
      `<p>Olá, ${user.name},</p>
<p>Clique no link abaixo para definir sua senha de acesso ao AlePejo ERP:</p>
<p><a href="${link}">${link}</a></p>
<p>Este link expira em 24 horas. Se você não pediu essa alteração, ignore este e-mail.</p>`,
    );

    return { sent: true };
  }

  /**
   * Consumo público do token de redefinição (usuário sem sessão,
   * clicando o link do e-mail). Chamado por AuthController.
   */
  async setPasswordWithToken(
    userId: string,
    token: string,
    password: string,
  ) {
    const user = await this.usersRepository.findByIdUnscoped(userId);

    if (
      !user ||
      !user.passwordResetTokenHash ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Link de redefinição inválido ou expirado. Peça um novo link.',
      );
    }

    const matches = await this.passwordService.compare(
      token,
      user.passwordResetTokenHash,
    );

    if (!matches) {
      throw new BadRequestException(
        'Link de redefinição inválido ou expirado. Peça um novo link.',
      );
    }

    const passwordHash = await this.passwordService.hash(password);

    await this.usersRepository.update(user.id, {
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      status: UserStatus.ACTIVE,
      active: true,
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    return { success: true };
  }

  async remove(companyId: string, id: string) {
    await this.findById(companyId, id);

    return this.usersRepository.softDelete(id);
  }
}
