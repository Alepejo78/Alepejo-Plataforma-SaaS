import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { LicenseRepository } from '../repositories/license.repository';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';
import {
  CUSTOM_PLAN_CODE,
  MINIMUM_CUSTOM_MODULE_CODES,
} from '../constants/custom-plan.constants';

@Injectable()
export class LicenseService {
  constructor(
    private readonly repository: LicenseRepository,
  ) {}

  async getCompanyLicenses(companyId: string) {
    const company =
      await this.repository.findCompany(companyId);

    if (!company) {
      throw new NotFoundException(
        'Empresa não encontrada.',
      );
    }

    return {
      ...company,
      companyPlan: company.companyPlan
        ? {
            ...company.companyPlan,
            // "TRIAL com a data já vencida" é teste terminado, não
            // teste em andamento — a tela precisa saber pra não
            // anunciar "Período de teste" logo abaixo do aviso de que
            // o teste acabou.
            expired: this.isSubscriptionBlocked(company.companyPlan),
          }
        : null,
      companyModules: company.companyModules.map((item) => ({
        ...item,
        licenseStatus: this.moduleLicenseStatus(
          company.companyPlan,
          item,
        ),
      })),
    };
  }

  /**
   * Situação de cada módulo pra mostrar na tela de Licenciamento. A
   * regra pedida pelo usuário: "Ativo" só quando existe compra paga —
   * antes disso é "A contratar", e quando a assinatura vence tudo o
   * que estava contratado vira "Expirou".
   *
   * Durante o período de teste, todo módulo habilitado libera acesso
   * mesmo sem contratação (`licensed: false`) — é assim que
   * `hasModule()` já funciona (módulo ajustado depois do cadastro
   * inicial nasce "a contratar" mesmo em teste, ver
   * `syncCustomModules`). Por isso o teste precisa ser checado ANTES
   * do `licensed`: senão a tela mostra "A contratar" pra um módulo que
   * na prática já está liberado, o que confunde mais do que ajuda.
   *
   * - DISABLED    — desmarcado pelo próprio cliente.
   * - TRIAL       — dentro do período de teste (mesmo se ainda não
   *                 contratado — o teste libera tudo de propósito).
   * - TO_CONTRACT — fora do teste e ainda sem contratação que o cubra
   *                 (`licensed: false`): módulo escolhido depois, que
   *                 só vira contratado quando o pagamento é confirmado.
   * - EXPIRED     — contratado, mas a assinatura venceu/bloqueou.
   * - ACTIVE      — contratado e com assinatura paga em dia.
   */
  moduleLicenseStatus(
    companyPlan: {
      status: string;
      trialEndsAt: Date | null;
      graceUntil: Date | null;
    } | null,
    companyModule: { enabled: boolean; licensed: boolean },
  ): 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'TO_CONTRACT' | 'DISABLED' {
    if (!companyModule.enabled) {
      return 'DISABLED';
    }

    if (this.isSubscriptionBlocked(companyPlan)) {
      return 'EXPIRED';
    }

    if (companyPlan?.status === 'TRIAL') {
      return 'TRIAL';
    }

    if (!companyModule.licensed) {
      return 'TO_CONTRACT';
    }

    return companyPlan?.status === 'ACTIVE' ? 'ACTIVE' : 'EXPIRED';
  }

  async getPlans() {
    return this.repository.findPlans();
  }

  async getModules() {
    return this.repository.findModules();
  }

  async assignPlan(
    companyId: string,
    planId: string,
    trialEndsAt?: Date,
  ) {
    return this.repository.assignPlan(
      companyId,
      planId,
      trialEndsAt,
    );
  }

  async enableModule(
    companyId: string,
    moduleId: string,
    expiresAt?: Date,
    licensed = true,
  ) {
    return this.repository.enableModule(
      companyId,
      moduleId,
      expiresAt,
      licensed,
    );
  }

  async disableModule(
    companyId: string,
    moduleId: string,
  ) {
    return this.repository.disableModule(
      companyId,
      moduleId,
    );
  }

  /**
   * Autoatendimento: cliente já cadastrado monta (ou reajusta) o
   * próprio plano por módulo avulso — mesmo mecanismo do plano
   * Customizado no cadastro público (`CompanyOnboardingService.
   * signup`), só que trocando o plano atual em vez de criar empresa.
   * Sincroniza pra valer: habilita quem entrou, desabilita quem saiu
   * (menos o mínimo, sempre garantido). Não cobra nada sozinho — quem
   * cobra é `BillingService.subscribe()` (já sabe somar o preço dos
   * módulos quando o plano é CUSTOM), chamado à parte pelo frontend.
   */
  async setCustomModules(companyId: string, moduleIds: string[]) {
    const customPlan = await this.repository.findPlanByCode(
      CUSTOM_PLAN_CODE,
    );

    if (!customPlan) {
      throw new NotFoundException('Plano Customizado não configurado.');
    }

    const company = await this.repository.findCompany(companyId);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const allModules = await this.repository.findModules();

    const minimumIds = allModules
      .filter((m) => MINIMUM_CUSTOM_MODULE_CODES.includes(m.code))
      .map((m) => m.id);

    const chosenIds = allModules
      .filter((m) => moduleIds.includes(m.id))
      .map((m) => m.id);

    const finalIds = new Set([...minimumIds, ...chosenIds]);

    await this.repository.assignPlan(companyId, customPlan.id);

    // Módulo que já estava na empresa mantém a situação que tinha; o
    // que entra agora nasce "a contratar" (`licensed: false`), porque
    // marcar aqui não paga nada — quem paga é o BillingService, e é o
    // webhook do pagamento que promove todo mundo pra contratado.
    const previous = new Map(
      company.companyModules.map((item) => [item.moduleId, item]),
    );

    for (const moduleId of finalIds) {
      const existing = previous.get(moduleId);
      const licensed = existing
        ? existing.licensed
        : minimumIds.includes(moduleId);

      await this.enableModule(companyId, moduleId, undefined, licensed);
    }

    const currentlyEnabled = company.companyModules
      .filter((item) => item.enabled)
      .map((item) => item.moduleId);

    for (const moduleId of currentlyEnabled) {
      if (!finalIds.has(moduleId)) {
        await this.disableModule(companyId, moduleId);
      }
    }

    return this.getCompanyLicenses(companyId);
  }

  async startTrial(
    companyId: string,
    moduleId: string,
    days: number,
  ) {
    const trialEndsAt = new Date();

    trialEndsAt.setDate(
      trialEndsAt.getDate() + days,
    );

    return this.repository.startTrial(
      companyId,
      moduleId,
      trialEndsAt,
    );
  }

  /**
   * A assinatura (CompanyPlan) bloqueia acesso quando: TRIAL vencido,
   * PAST_DUE com a tolerância vencida, ou BLOCKED/CANCELLED.
   *
   * `trialEndsAt`/`graceUntil` nulos NÃO bloqueiam — toda empresa
   * criada antes desta migração ganhou `status: TRIAL` por padrão sem
   * nenhuma data de teste marcada (a coluna não existia até agora).
   * Tratar "sem data" como "já venceu" bloquearia de uma hora pra
   * outra todo cliente que já estava usando o sistema. Só bloqueia
   * quando há mesmo uma data e ela já passou.
   */
  /**
   * Público de propósito — também usado por `AuthService` pra montar a
   * lista de módulos da sessão/menu (`/auth/login`, `/auth/me`), que
   * não pode ficar sabendo de menos que o `LicenseGuard`: senão o
   * menu mostra tudo clicável pra quem está bloqueado, e cada clique
   * erra com 403 — pior experiência do que simplesmente esconder.
   */
  isSubscriptionBlocked(
    companyPlan: {
      status: string;
      trialEndsAt: Date | null;
      graceUntil: Date | null;
    } | null,
  ): boolean {
    if (!companyPlan) {
      return false;
    }

    const now = new Date();

    switch (companyPlan.status) {
      case 'BLOCKED':
      case 'CANCELLED':
        return true;
      case 'TRIAL':
        return Boolean(
          companyPlan.trialEndsAt && companyPlan.trialEndsAt < now,
        );
      case 'PAST_DUE':
        // PAST_DUE sem graceUntil só deveria acontecer se o job de
        // cobrança (Fase 5) esquecer de marcar a tolerância — mais
        // seguro negar do que liberar acesso indefinido a quem já
        // está inadimplente.
        return !companyPlan.graceUntil || companyPlan.graceUntil < now;
      default:
        return false;
    }
  }

  async hasModule(
    companyId: string,
    moduleCode: string,
  ): Promise<boolean> {
    const company =
      await this.repository.findCompany(companyId);

    if (!company) {
      return false;
    }

    // Módulos básicos do ERP sempre disponíveis — inclusive com a
    // assinatura bloqueada, senão o cliente nem consegue entrar pra
    // resolver a pendência e voltar a usar o sistema.
    if (
      [
        'BPS',
        'AUTH',
        'CONFIG',
        'DASHBOARD',
      ].includes(moduleCode)
    ) {
      return true;
    }

    if (this.isSubscriptionBlocked(company.companyPlan)) {
      return false;
    }

    // Módulos liberados pelo plano
    if (
      company.companyPlan?.plan?.planModules?.some(
        (item) =>
          item.included &&
          item.module.code === moduleCode,
      )
    ) {
      return true;
    }

    // Módulos licenciados individualmente
    const companyModule =
      company.companyModules.find(
        (item) =>
          item.module.code === moduleCode,
      );

    if (!companyModule) {
      return false;
    }

    if (!companyModule.enabled) {
      return false;
    }

    // Módulo ainda "a contratar" (`licensed: false`): durante o teste
    // vale mesmo assim — o período de avaliação libera o sistema
    // inteiro de propósito, pra pessoa experimentar antes de comprar.
    // Terminado o teste, só libera depois de pago.
    if (
      !companyModule.licensed &&
      company.companyPlan?.status !== 'TRIAL'
    ) {
      return false;
    }

    if (
      companyModule.expiresAt &&
      companyModule.expiresAt < new Date()
    ) {
      return false;
    }

    return true;
  }


async getDashboard() {
  const [companies, plans, modules, licenses] =
    await this.repository.dashboard();

  return {
    companies,
    plans,
    modules,
    licenses,
  };
}

async getPlan(id: string) {
  return this.repository.findPlan(id);
}

async createPlan(dto: CreatePlanDto) {
  return this.repository.createPlan(dto);
}

async updatePlan(id: string, dto: UpdatePlanDto) {
  return this.repository.updatePlan(id, dto);
}

async removePlan(id: string) {
  try {
    return await this.repository.removePlan(id);
  } catch (err) {
    // A violação de FK (empresa presa nesse plano, `onDelete:
    // Restrict` no schema) às vezes chega como
    // `PrismaClientKnownRequestError` (P2003) e às vezes como
    // `PrismaClientUnknownRequestError` (erro cru do Postgres,
    // código 23001/23503) — depende de como o Postgres devolve o
    // erro. Por isso checa pela mensagem em vez de só pelo tipo.
    const message = err instanceof Error ? err.message : String(err);
    const isForeignKeyViolation =
      (err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003') ||
      /foreign key constraint|violates.*RESTRICT/i.test(message);

    if (isForeignKeyViolation) {
      throw new ConflictException(
        'Não é possível excluir: existem empresas usando este plano. Desative-o em vez de excluir, ou mude essas empresas de plano antes.',
      );
    }

    throw err;
  }
}

async getModule(id: string) {
  return this.repository.findModule(id);
}

async createModule(dto: CreateModuleDto) {
  return this.repository.createModule(dto);
}

async updateModule(id: string, dto: UpdateModuleDto) {
  return this.repository.updateModule(id, dto);
}

async removeModule(id: string) {
  return this.repository.removeModule(id);
}

async history(companyId: string) {
  return this.repository.history(companyId);
}

async getPlatformSettings() {
  return this.repository.getPlatformSettings();
}

async updatePlatformSettings(trialDays: number) {
  return this.repository.updatePlatformSettings({ trialDays });
}
}