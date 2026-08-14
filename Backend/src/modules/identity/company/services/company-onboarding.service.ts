import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { UsersService } from '../../users/services/users.service';
import { LicenseService } from '../../license/services/license.service';

import { CompanyRepository } from '../repositories/company.repository';
import { CompanySignupDto } from '../dto/company-signup.dto';
import { CompanyAdditionalDto } from '../dto/company-additional.dto';

const DEFAULT_PLAN_CODE = 'ENTERPRISE';

function cnpjRoot(document: string): string {
  return document.replace(/\D/g, '').slice(0, 8);
}

/**
 * Orquestra o que hoje só existe espalhado: cadastrar a empresa +
 * dar plano padrão + criar o perfil Administrador com todas as
 * permissões + criar o primeiro usuário + disparar o e-mail de
 * definir senha. Mesma sequência que `prisma/seed.ts` faz pra
 * ALEPEJO, só que em tempo de execução, por empresa nova.
 */
@Injectable()
export class CompanyOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyRepository: CompanyRepository,
    private readonly usersService: UsersService,
    private readonly licenseService: LicenseService,
  ) {}

  /** Cliente novo, sem login prévio — a própria empresa nasce raiz. */
  async signup(dto: CompanySignupDto) {
    const companyExists = await this.companyRepository.findByDocument(
      dto.document,
    );

    if (companyExists) {
      throw new ConflictException(
        'Já existe uma empresa cadastrada com este documento.',
      );
    }

    const company = await this.companyRepository.create({
      code: cnpjRoot(dto.document) || dto.document.slice(0, 20),
      legalName: dto.legalName,
      tradeName: dto.tradeName,
      document: dto.document,
      email: dto.email,
      phone: dto.phone,
      active: true,
    });

    await this.provisionPlan(company.id);
    const roleId = await this.provisionAdminRole(company.id);
    await this.provisionAdminUser(
      company.id,
      dto.adminName,
      dto.email,
      roleId,
    );

    return { companyId: company.id };
  }

  /**
   * Cliente já licenciado cadastrando outra empresa dele — só
   * permitido se o CNPJ tiver a mesma raiz (8 primeiros dígitos) do
   * CNPJ da empresa que já tem a licença. A empresa nova herda o
   * mesmo plano/módulos da raiz, não precisa comprar de novo.
   */
  async createAdditional(
    requesterCompanyId: string,
    requesterUserId: string,
    requesterEmail: string,
    dto: CompanyAdditionalDto,
  ) {
    const companyExists = await this.companyRepository.findByDocument(
      dto.document,
    );

    if (companyExists) {
      throw new ConflictException(
        'Já existe uma empresa cadastrada com este documento.',
      );
    }

    const requester = await this.companyRepository.findById(
      requesterCompanyId,
    );

    if (!requester) {
      throw new BadRequestException('Empresa solicitante não encontrada.');
    }

    const rootCompanyId = requester.rootCompanyId ?? requester.id;
    const rootCompany =
      rootCompanyId === requester.id
        ? requester
        : await this.companyRepository.findById(rootCompanyId);

    if (!rootCompany) {
      throw new BadRequestException('Empresa raiz não encontrada.');
    }

    if (cnpjRoot(dto.document) !== cnpjRoot(rootCompany.document)) {
      throw new BadRequestException(
        'O CNPJ precisa ter a mesma raiz (8 primeiros dígitos) do CNPJ da empresa que já tem a licença.',
      );
    }

    const company = await this.companyRepository.create({
      code: `${cnpjRoot(dto.document)}-${Date.now().toString().slice(-4)}`,
      legalName: dto.legalName,
      tradeName: dto.tradeName,
      document: dto.document,
      email: dto.email,
      phone: dto.phone,
      active: true,
      rootCompany: {
        connect: { id: rootCompanyId },
      },
    });

    await this.copyLicense(rootCompanyId, company.id);
    const roleId = await this.provisionAdminRole(company.id);

    // Quem cadastrou a empresa nova já ganha acesso a ela (login
    // cruzado, ver AuthService.switchCompany), com o perfil
    // Administrador recém-criado.
    await this.prisma.userCompany.upsert({
      where: {
        userId_companyId: {
          userId: requesterUserId,
          companyId: company.id,
        },
      },
      create: { userId: requesterUserId, companyId: company.id },
      update: {},
    });

    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: requesterUserId, roleId },
      },
      create: { userId: requesterUserId, roleId },
      update: {},
    });

    // Se o "e-mail do administrador" informado for o mesmo de quem
    // está cadastrando, o vínculo acima já basta — criar um usuário
    // separado colidiria com o e-mail único (@unique) e duplicaria a
    // conta da mesma pessoa.
    const sameEmailAsRequester =
      dto.adminEmail.trim().toLowerCase() ===
      requesterEmail.trim().toLowerCase();

    if (!sameEmailAsRequester) {
      await this.provisionAdminUser(
        company.id,
        dto.adminName,
        dto.adminEmail,
        roleId,
      );
    }

    return { companyId: company.id };
  }

  private async provisionPlan(companyId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { code: DEFAULT_PLAN_CODE },
    });

    if (!plan) {
      return;
    }

    await this.licenseService.assignPlan(companyId, plan.id);
  }

  /** Copia o plano e os add-ons habilitados da raiz — mesma licença, sem comprar de novo. */
  private async copyLicense(rootCompanyId: string, companyId: string) {
    const rootPlan = await this.prisma.companyPlan.findUnique({
      where: { companyId: rootCompanyId },
    });

    if (rootPlan) {
      await this.licenseService.assignPlan(companyId, rootPlan.planId);
    } else {
      await this.provisionPlan(companyId);
    }

    const rootModules = await this.prisma.companyModule.findMany({
      where: { companyId: rootCompanyId, enabled: true },
    });

    for (const mod of rootModules) {
      await this.licenseService.enableModule(
        companyId,
        mod.moduleId,
        mod.expiresAt ?? undefined,
      );
    }
  }

  /** Cria a Role "Administrador" com todas as permissions do catálogo — mesma lógica de prisma/seed.ts. */
  private async provisionAdminRole(companyId: string): Promise<string> {
    const role = await this.prisma.role.create({
      data: {
        companyId,
        code: 'ADMIN',
        name: 'Administrador',
        description: 'Perfil com acesso total ao sistema.',
        active: true,
      },
    });

    const permissions = await this.prisma.permission.findMany();

    await this.prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
    });

    return role.id;
  }

  private async provisionAdminUser(
    companyId: string,
    name: string,
    email: string,
    roleId: string,
  ) {
    const user = await this.usersService.create(companyId, {
      name,
      email,
      password: crypto.randomUUID(),
      roleId,
    });

    await this.usersService.requestPasswordReset(companyId, user.id);

    return user;
  }
}
