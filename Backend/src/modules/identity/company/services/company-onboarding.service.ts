import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  Injectable,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { DefaultAccountingService } from '../../../../core/default-accounting/default-accounting.service';
import { UsersService } from '../../users/services/users.service';
import { LicenseService } from '../../license/services/license.service';
import { CUSTOM_PLAN_CODE } from '../../license/constants/custom-plan.constants';

import { CompanyRepository } from '../repositories/company.repository';
import { CompanySignupDto } from '../dto/company-signup.dto';
import { CompanyAdditionalDto } from '../dto/company-additional.dto';

const DEFAULT_PLAN_CODE = 'ENTERPRISE';

/** Usado só se a linha de `PlatformSettings` ainda não existir por algum motivo. */
const FALLBACK_TRIAL_DAYS = 14;

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
    private readonly defaultAccounting: DefaultAccountingService,
  ) {}

  /** Cliente novo, sem login prévio — a própria empresa nasce raiz. */
  async signup(dto: CompanySignupDto) {
    if (!documentType(dto.document)) {
      throw new BadRequestException(
        'Documento inválido — informe um CPF (11 dígitos) ou CNPJ (14 dígitos).',
      );
    }

    // Compra feita antes do cadastro ("Comprar agora" em /planos): o
    // plano, o ciclo e os módulos vêm do checkout, NUNCA do que o
    // navegador mandou — senão daria pra pagar o plano barato e se
    // cadastrar no caro.
    const checkout = dto.checkoutId
      ? await this.loadUsableCheckout(dto.checkoutId)
      : null;

    const planId = checkout?.planId ?? dto.planId;

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
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

    const platformSettings =
      await this.prisma.platformSettings.findFirst();

    // Quem comprou não ganha período de teste — já pagou (ou vai pagar
    // a cobrança que já está emitida).
    const trialEndsAt = checkout ? undefined : new Date();

    if (trialEndsAt) {
      trialEndsAt.setDate(
        trialEndsAt.getDate() +
          (platformSettings?.trialDays ?? FALLBACK_TRIAL_DAYS),
      );
    }

    await this.licenseService.assignPlan(company.id, plan.id, trialEndsAt);

    if (checkout) {
      await this.applyCheckoutToCompanyPlan(company.id, checkout);
    }

    if (plan.code === CUSTOM_PLAN_CODE) {
      await this.enableCustomModules(
        company.id,
        checkout ? checkout.moduleIds : (dto.moduleIds ?? []),
      );
    }

    const roleId = await this.provisionAdminRole(company.id);
    const user = await this.provisionAdminUser(
      company.id,
      dto.adminName,
      dto.adminEmail,
      roleId,
    );

    // Plano de contas padrão (42 contas / 6 classificações), unidade
    // "UN - Unidade" e o produto/serviço "0001 - Compra sistema ERP" —
    // sem isso a empresa nasce sem conseguir lançar nada no Financeiro
    // (decisão do usuário, 31-08-2026). Roda numa transação própria
    // (ver DefaultAccountingService), por último de propósito: se
    // falhar aqui a empresa já tem plano + perfil + login prontos, dá
    // pra entrar e reclamar / rodar o backfill manual depois — bem
    // mais recuperável do que falhar antes do login existir.
    await this.defaultAccounting.seedDefaultAccounting(company.id);

    return { companyId: company.id, userId: user.id };
  }

  /** Checkout precisa existir, não ter expirado e ainda não ter virado empresa. */
  private async loadUsableCheckout(checkoutId: string) {
    const checkout = await this.prisma.pendingCheckout.findUnique({
      where: { id: checkoutId },
    });

    if (!checkout) {
      throw new NotFoundException('Compra não encontrada.');
    }

    if (checkout.companyId) {
      throw new ConflictException(
        'Esta compra já foi usada para cadastrar uma empresa.',
      );
    }

    if (checkout.expiresAt < new Date()) {
      throw new BadRequestException(
        'Esta compra expirou. Faça uma nova compra em /planos.',
      );
    }

    return checkout;
  }

  /**
   * Liga a empresa recém-criada à cobrança que já existe no Asaas e
   * marca o checkout como usado.
   *
   * Pagamento já confirmado → ACTIVE. Ainda pendente (boleto, PIX não
   * pago) → PAST_DUE com `graceUntil` nulo, que o
   * `LicenseService.isSubscriptionBlocked()` trata como bloqueado: a
   * pessoa entra no sistema e acompanha o pagamento, mas os módulos só
   * liberam quando o webhook confirmar.
   */
  private async applyCheckoutToCompanyPlan(
    companyId: string,
    checkout: {
      id: string;
      billingCycle: 'MONTHLY' | 'YEARLY';
      asaasCustomerId: string | null;
      asaasSubscriptionId: string | null;
      paid: boolean;
    },
  ) {
    const periodDays = checkout.billingCycle === 'YEARLY' ? 365 : 30;
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + periodDays);

    await this.prisma.companyPlan.update({
      where: { companyId },
      data: {
        billingCycle: checkout.billingCycle,
        asaasCustomerId: checkout.asaasCustomerId,
        asaasSubscriptionId: checkout.asaasSubscriptionId,
        status: checkout.paid ? 'ACTIVE' : 'PAST_DUE',
        currentPeriodEnd: checkout.paid ? currentPeriodEnd : null,
        graceUntil: null,
        trialEndsAt: null,
      },
    });

    await this.prisma.pendingCheckout.update({
      where: { id: checkout.id },
      data: { companyId },
    });
  }

  /**
   * Plano Customizado não tem planModules fixo — o acesso vem inteiro
   * dos CompanyModule habilitados aqui. Todo módulo é opcional, nenhum
   * é forçado (decisão do usuário, 26-08-2026).
   */
  private async enableCustomModules(
    companyId: string,
    moduleIds: string[],
  ) {
    const chosenModules = await this.prisma.module.findMany({
      where: { id: { in: moduleIds }, active: true },
      select: { id: true },
    });

    for (const module of chosenModules) {
      await this.licenseService.enableModule(companyId, module.id);
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

    // Empresa adicional do grupo também precisa dos padrões — herda o
    // plano/módulos da raiz (copyLicense acima), mas o plano de CONTAS
    // é sempre próprio de cada empresa (ChartOfAccount é escopado por
    // companyId, não por grupo). Por último de propósito, mesmo motivo
    // do signup(): se falhar aqui, a empresa já tem plano + perfil +
    // vínculo de acesso prontos, dá pra entrar e resolver depois.
    await this.defaultAccounting.seedDefaultAccounting(company.id);

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
        // Herda inclusive o "a contratar": a empresa do grupo não
        // pode ter mais do que a raiz já pagou.
        mod.licensed,
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
