import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  Injectable,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { UsersService } from '../../users/services/users.service';
import { LicenseService } from '../../license/services/license.service';
import {
  CUSTOM_PLAN_CODE,
  MINIMUM_CUSTOM_MODULE_CODES,
} from '../../license/constants/custom-plan.constants';

import { CompanyRepository } from '../repositories/company.repository';
import { CompanySignupDto } from '../dto/company-signup.dto';
import { CompanyAdditionalDto } from '../dto/company-additional.dto';

const DEFAULT_PLAN_CODE = 'ENTERPRISE';

/**
 * Duração do teste grátis pra quem se cadastra escolhendo um plano
 * comercial — configurável via `TRIAL_DAYS` no .env (Railway/local),
 * mesmo padrão já usado para outros valores do sistema (ex.:
 * JWT_EXPIRES_IN). Sem a variável, mantém os 14 dias combinados.
 */
const TRIAL_DAYS = Number(process.env.TRIAL_DAYS) || 14;

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

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.active) {
      throw new NotFoundException('Plano não encontrado.');
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
      zipCode: dto.zipCode,
      street: dto.street,
      number: dto.number,
      district: dto.district,
      city: dto.city,
      state: dto.state,
      active: true,
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    await this.licenseService.assignPlan(company.id, plan.id, trialEndsAt);

    if (plan.code === CUSTOM_PLAN_CODE) {
      await this.enableCustomModules(company.id, dto.moduleIds ?? []);
    }

    const roleId = await this.provisionAdminRole(company.id);
    await this.provisionAdminUser(
      company.id,
      dto.adminName,
      dto.adminEmail,
      roleId,
    );

    return { companyId: company.id };
  }

  /**
   * Plano Customizado não tem planModules fixo — o acesso vem inteiro
   * dos CompanyModule habilitados aqui. O mínimo
   * (`MINIMUM_CUSTOM_MODULE_CODES`) sempre entra, mesmo que o
   * montador não tenha mandado (defesa contra bug no front ou
   * chamada direta da API).
   */
  private async enableCustomModules(
    companyId: string,
    moduleIds: string[],
  ) {
    const minimumModules = await this.prisma.module.findMany({
      where: { code: { in: MINIMUM_CUSTOM_MODULE_CODES }, active: true },
      select: { id: true },
    });

    const chosenModules = await this.prisma.module.findMany({
      where: { id: { in: moduleIds }, active: true },
      select: { id: true },
    });

    const allIds = new Set([
      ...minimumModules.map((m) => m.id),
      ...chosenModules.map((m) => m.id),
    ]);

    for (const moduleId of allIds) {
      await this.licenseService.enableModule(companyId, moduleId);
    }
  }

  /**
   * Cliente já licenciado cadastrando outra empresa dele. Com CNPJ, só
   * permitido se a raiz (8 primeiros dígitos) bater com a da empresa
   * que já tem a licença — checagem automática. CPF não tem esse
   * rastro de raiz, então exige a confirmação manual
   * (`dto.isGroupCompany`) em vez disso. A empresa nova herda o mesmo
   * plano/módulos da raiz, não precisa comprar de novo.
   *
   * Não cria usuário nenhum aqui — só vincula quem já está logado
   * (login cruzado) à empresa nova. Convidar outra pessoa pra essa
   * empresa é decisão separada do administrador, feita depois em
   * Configurações > Usuários, não algo automático no cadastro da
   * empresa.
   */
  async createAdditional(
    requesterCompanyId: string,
    requesterUserId: string,
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
      const sameRoot =
        cnpjRoot(dto.document) === cnpjRoot(rootCompany.document);

      // Nem toda empresa do grupo compartilha a raiz do CNPJ (grupos
      // econômicos com CNPJs de raízes diferentes existem) — sem raiz
      // batendo, exige a mesma confirmação manual que o CPF já usa.
      if (!sameRoot && !dto.isGroupCompany) {
        throw new BadRequestException(
          'O CNPJ não tem a mesma raiz (8 primeiros dígitos) do CNPJ da empresa que já tem a licença — confirme que esta é uma empresa do grupo.',
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
      zipCode: dto.zipCode,
      street: dto.street,
      number: dto.number,
      district: dto.district,
      city: dto.city,
      state: dto.state,
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

  /**
   * Cria a Role "Administrador" com todas as permissions do catálogo,
   * EXCETO as `platform.*` — essas são de administração da plataforma
   * como um todo (gerenciar o catálogo global de planos/módulos,
   * gerenciar o catálogo de permissions), reservadas pra quem opera o
   * AlePejo ERP Cloud (empresa ALEPEJO do seed), nunca pro admin de um
   * cliente que assinou o sistema. Conceder isso a cada empresa nova
   * dava acesso de dono da plataforma pra qualquer cliente.
   */
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

    const permissions = await this.prisma.permission.findMany({
      where: { NOT: { code: { startsWith: 'platform.' } } },
    });

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
