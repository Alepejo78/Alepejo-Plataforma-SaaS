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

/** Menor código raiz gerado pra cliente novo — os manuais (ex.: "ALEPEJO") ficam fora dessa faixa. */
const GROUP_CODE_BASE = 1000;

function cnpjRoot(document: string): string {
  return document.replace(/\D/g, '').slice(0, 8);
}

/** CNPJ (14 dígitos) ou CPF (11) — null se não bater com nenhum dos dois. */
function documentType(document: string): 'CNPJ' | 'CPF' | null {
  const digits = document.replace(/\D/g, '');

  if (digits.length === 14) {
    return 'CNPJ';
  }

  if (digits.length === 11) {
    return 'CPF';
  }

  return null;
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
    if (!documentType(dto.document)) {
      throw new BadRequestException(
        'Documento inválido — informe um CPF (11 dígitos) ou CNPJ (14 dígitos).',
      );
    }

    const companyExists = await this.companyRepository.findByDocument(
      dto.document,
    );

    if (companyExists) {
      throw new ConflictException(
        'Já existe uma empresa cadastrada com este documento.',
      );
    }

    const company = await this.companyRepository.create({
      code: await this.nextRootGroupCode(),
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
   * Cliente já licenciado cadastrando outra empresa dele. Com CNPJ, só
   * permitido se a raiz (8 primeiros dígitos) bater com a da empresa
   * que já tem a licença — checagem automática. CPF não tem esse
   * rastro de raiz, então exige a confirmação manual
   * (`dto.isGroupCompany`) em vez disso. A empresa nova herda o mesmo
   * plano/módulos da raiz, não precisa comprar de novo.
   */
  async createAdditional(
    requesterCompanyId: string,
    requesterUserId: string,
    requesterEmail: string,
    dto: CompanyAdditionalDto,
  ) {
    const docType = documentType(dto.document);

    if (!docType) {
      throw new BadRequestException(
        'Documento inválido — informe um CPF (11 dígitos) ou CNPJ (14 dígitos).',
      );
    }

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

    if (docType === 'CNPJ') {
      if (cnpjRoot(dto.document) !== cnpjRoot(rootCompany.document)) {
        throw new BadRequestException(
          'O CNPJ precisa ter a mesma raiz (8 primeiros dígitos) do CNPJ da empresa que já tem a licença.',
        );
      }
    } else if (!dto.isGroupCompany) {
      throw new BadRequestException(
        'CPF não tem raiz pra conferir automaticamente — confirme que esta é uma empresa do grupo.',
      );
    }

    const company = await this.companyRepository.create({
      code: await this.nextGroupCode(rootCompany.id, rootCompany.code),
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

  /**
   * Código interno pra amarrar empresas do mesmo grupo sem se
   * misturar com as de outro cliente: cada cliente novo (raiz) ganha
   * o próximo número livre a partir de 1000 (1000, 1001, ...) — os
   * códigos manuais (ex.: "ALEPEJO", cadastrados direto no seed) não
   * entram nessa faixa, então nunca colidem nem afetam a contagem.
   */
  private async nextRootGroupCode(): Promise<string> {
    const roots = await this.prisma.company.findMany({
      where: { rootCompanyId: null },
      select: { code: true },
    });

    const used = roots
      .map((root) => Number(root.code))
      .filter((n) => Number.isInteger(n) && n >= GROUP_CODE_BASE);

    const next =
      used.length > 0 ? Math.max(...used) + 1 : GROUP_CODE_BASE;

    return String(next);
  }

  /**
   * Código de uma empresa adicional dentro do grupo: sufixo sequencial
   * em cima do código da raiz (raiz "1000" → primeira adicional
   * "1000_1", segunda "1000_2", ...) — conta quantas empresas já
   * existem hoje nesse `rootCompanyId` e soma 1, não reaproveita
   * "buracos" de empresas excluídas.
   */
  private async nextGroupCode(
    rootCompanyId: string,
    rootCode: string,
  ): Promise<string> {
    const siblingsCount = await this.prisma.company.count({
      where: { rootCompanyId },
    });

    return `${rootCode}_${siblingsCount + 1}`;
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
