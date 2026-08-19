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
   * Gera o token e dispara o e-mail com o link de definir senha.
   * Compartilhado pelos dois caminhos que levam a isso: o admin
   * pedindo pra um usuário (`requestPasswordReset`) e o próprio
   * usuário pelo "Esqueci minha senha"
   * (`requestPasswordResetByEmail`). Best-effort: o envio nunca lança,
   * mesmo padrão de EmailNotificationsService.send.
   */
  private async sendPasswordResetLink(user: {
    id: string;
    name: string;
    email: string;
    companyId: string;
  }) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await this.passwordService.hash(token);

    await this.usersRepository.update(user.id, {
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: new Date(
        Date.now() + PASSWORD_RESET_TOKEN_TTL_MS,
      ),
    });

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { slug: true, tradeName: true, legalName: true },
    });

    const frontendUrl =
      process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetLink = `${frontendUrl}/definir-senha?userId=${user.id}&token=${token}`;
    const loginLink = company
      ? `${frontendUrl}/${company.slug}/login`
      : `${frontendUrl}/login`;
    const companyName = company?.tradeName || company?.legalName || '';

    void this.emailNotifications.send(
      user.companyId,
      user.email,
      'Defina sua senha de acesso — AlePejo ERP',
      `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
  <div style="text-align: center; padding: 24px 0;">
    <img src="${frontendUrl}/logo.png" alt="AlePejo" width="64" height="64" />
    <h1 style="font-size: 20px; margin: 12px 0 4px;">AlePejo ERP Cloud</h1>
    <p style="color: #666; font-size: 13px; margin: 0;">Gestão inteligente para empresas</p>
  </div>
  <p>Olá, ${user.name},</p>
  <p>Sua conta (<strong>${user.email}</strong>)${companyName ? ` da empresa <strong>${companyName}</strong>` : ''} foi criada. Clique no botão abaixo para definir sua senha de acesso:</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="${resetLink}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Definir minha senha</a>
  </p>
  <p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${resetLink}">${resetLink}</a></p>
  <p style="font-size: 13px; color: #666;">Este link expira em 24 horas. Se você não pediu essa alteração, ignore este e-mail.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="font-size: 14px;"><strong>Guarde este link — é ele que você vai usar sempre para entrar no sistema:</strong></p>
  <p style="text-align: center; margin: 16px 0;">
    <a href="${loginLink}" style="background: #eef2ff; color: #2563eb; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">${loginLink}</a>
  </p>
  <p style="font-size: 13px; color: #666;">Salve nos favoritos do navegador ou na tela inicial do celular — o login não tem mais um endereço único para todo mundo, cada empresa tem o seu.</p>
</div>`,
    );
  }

  /**
   * Admin pedindo o link pra um usuário da empresa dele (usuário novo,
   * ou "Alterar Senha" na lista de usuários).
   */
  async requestPasswordReset(companyId: string, id: string) {
    const user = await this.findById(companyId, id);

    await this.sendPasswordResetLink(user);

    return { sent: true };
  }

  /**
   * "Esqueci minha senha": o próprio usuário pede o link, sem sessão,
   * informando só o e-mail.
   *
   * Responde SEMPRE `{ sent: true }`, exista o e-mail ou não. Dizer
   * "e-mail não encontrado" transformaria a tela num validador de
   * quais e-mails têm conta aqui (enumeração de usuários), que é
   * exatamente o que um atacante quer antes de tentar senha.
   */
  async requestPasswordResetByEmail(email: string) {
    const user = await this.usersRepository.findByEmail(email);

    if (user && user.active) {
      await this.sendPasswordResetLink(user);
    }

    return { sent: true };
  }

  /**
   * Confere o par userId+token do link de redefinição — mesma
   * checagem usada tanto pra consumir o token (`setPasswordWithToken`)
   * quanto só pra mostrar o e-mail antes disso (`getResetInfo`).
   * Exige o token certo pra revelar qualquer coisa: sem ele, um userId
   * chutado não devolve nada (evita enumeração de contas).
   */
  private async validateResetToken(userId: string, token: string) {
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

    return user;
  }

  /**
   * Só pra exibir o e-mail da conta na tela de definir senha, antes
   * do usuário digitar a nova senha — confirma visualmente pra qual
   * conta é o link. Chamado por AuthController.
   */
  async getResetInfo(userId: string, token: string) {
    const user = await this.validateResetToken(userId, token);

    return { email: user.email };
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
    const user = await this.validateResetToken(userId, token);

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

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { slug: true },
    });

    return { success: true, companySlug: company?.slug ?? null };
  }

  async remove(companyId: string, id: string) {
    await this.findById(companyId, id);

    return this.usersRepository.softDelete(id);
  }
}
