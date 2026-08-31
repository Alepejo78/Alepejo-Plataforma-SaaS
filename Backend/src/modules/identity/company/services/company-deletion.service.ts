import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import { PLATFORM_COMPANY_CODE } from '../../../../core/constants/platform.constants';
import { AsaasService } from '../../../billing/services/asaas.service';

interface MovementCheck {
  label: string;
  count: () => Promise<number>;
}

/**
 * Excluir empresa (dono da plataforma) — exclusão FÍSICA (não
 * `deletedAt`), decisão do usuário (31-08-2026): marcar como excluída
 * não libera `Company.document`/`slug`/`code`, únicos no banco
 * inteiro, e o objetivo é justamente poder recadastrar o mesmo CNPJ de
 * teste depois. Só permitida se a empresa não tiver NENHUMA
 * movimentação — ver `assertNoMovement`.
 *
 * Restrição de acesso (permissão + e-mail do dono) fica no
 * `PermissionsGuard` (`platform.company.delete`), igual ao padrão já
 * usado por `platform.license.manage` — este serviço não reconfere
 * isso, confia no guard da rota.
 */
@Injectable()
export class CompanyDeletionService {
  private readonly logger = new Logger(CompanyDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
  ) {}

  async deletePermanently(
    companyId: string,
    confirmDocument: string,
    actor: { id: string; email: string; name: string },
  ): Promise<{ success: true }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { companyPlan: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    if (company.code === PLATFORM_COMPANY_CODE) {
      throw new ForbiddenException(
        'A empresa da própria plataforma (ALEPEJO) não pode ser excluída.',
      );
    }

    const onlyDigits = (value: string) => value.replace(/\D/g, '');

    if (onlyDigits(confirmDocument) !== onlyDigits(company.document)) {
      throw new BadRequestException(
        'O CNPJ/CPF informado não confere com o da empresa — confirme antes de excluir.',
      );
    }

    const childrenCount = await this.prisma.company.count({
      where: { rootCompanyId: companyId },
    });

    if (childrenCount > 0) {
      throw new ConflictException(
        `Esta empresa é a raiz de ${childrenCount} empresa(s) do grupo — exclua ou desvincule as filiais antes.`,
      );
    }

    await this.assertNoMovement(companyId);
    await this.assertNoSharedLogin(companyId);

    const asaasSubscriptionId = company.companyPlan?.asaasSubscriptionId;

    // Best-effort: o Asaas fora do ar (ou a assinatura já removida lá)
    // não pode impedir a exclusão local — mesmo padrão de tratamento
    // já usado nas outras chamadas ao Asaas em billing.service.ts.
    if (asaasSubscriptionId) {
      try {
        await this.asaas.deleteSubscription(asaasSubscriptionId);
      } catch (err) {
        this.logger.warn(
          `Não consegui cancelar a assinatura ${asaasSubscriptionId} no Asaas antes de excluir a empresa ${company.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    this.logger.warn(
      `Iniciando exclusão PERMANENTE de empresa: ${company.legalName} (documento ${company.document}, id ${company.id}) — solicitada por ${actor.email} (${actor.name}, id ${actor.id}) em ${new Date().toISOString()}.`,
    );

    try {
      // Ordem obrigatória: `users.companyId` tem FK RESTRICT pra
      // companies (única exceção sem cascade em todo o schema — ver
      // migration 20260722210641_create_users) — sem apagar os
      // usuários desta empresa primeiro, o delete da empresa quebra
      // por violação de FK. Todo o resto (Role, BusinessPartner,
      // Product, ChartOfAccount, FinancialEntry, Employee, etc.)
      // cascade a partir da própria Company.
      await this.prisma.$transaction([
        this.prisma.user.deleteMany({ where: { companyId } }),
        this.prisma.company.delete({ where: { id: companyId } }),
      ]);
    } catch (err) {
      // A essa altura a assinatura no Asaas já pode ter sido
      // cancelada acima (best-effort) — se o delete local falhar
      // depois disso, a empresa continua ativa aqui mas sem cobrança
      // futura no Asaas: perda de receita silenciosa se ninguém
      // perceber. Log explícito pra aparecer no Railway.
      if (asaasSubscriptionId) {
        this.logger.error(
          `Exclusão da empresa ${company.id} (${company.legalName}) FALHOU depois de cancelar a assinatura ${asaasSubscriptionId} no Asaas — a empresa continua existindo localmente, mas sem cobrança futura. Verificar manualmente. Erro: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      throw err;
    }

    this.logger.warn(
      `Exclusão PERMANENTE de empresa concluída: ${company.legalName} (documento ${company.document}, id ${company.id}) — executada por ${actor.email} (${actor.name}, id ${actor.id}) em ${new Date().toISOString()}.`,
    );

    return { success: true };
  }

  /**
   * `User.companyId` é só a empresa ATIVA da sessão no momento (troca
   * com `AuthService.switchCompany`), não necessariamente a empresa
   * "dona" do login — em `createAdditional` (empresa filial do mesmo
   * grupo), é comum o admin da empresa raiz ficar logado na filial via
   * login cruzado sem ter um usuário próprio criado lá. Apagar
   * `User.deleteMany({ where: { companyId } })` nesse cenário apagaria
   * fisicamente o login dele — que continua sendo cliente pagante
   * ativo na empresa raiz.
   *
   * Todo usuário nasce com um `UserCompany` auto-vinculado à própria
   * empresa (ver `UsersService.create`), então essa tabela sempre
   * reflete o conjunto real de empresas que o login acessa,
   * independente de qual está ativa agora. Se algum usuário
   * `companyId === companyId-alvo` tiver um `UserCompany` apontando
   * pra OUTRA empresa, o login não é exclusivo desta e a exclusão é
   * bloqueada.
   */
  private async assertNoSharedLogin(companyId: string): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { companyId },
      select: {
        email: true,
        companies: { select: { companyId: true } },
      },
    });

    const sharedUser = users.find((user) =>
      user.companies.some((link) => link.companyId !== companyId),
    );

    if (sharedUser) {
      throw new ConflictException(
        `Não é possível excluir: o usuário ${sharedUser.email} também tem acesso a outra empresa do grupo — mova o login dele antes de excluir esta empresa.`,
      );
    }
  }

  /**
   * Critério de "sem movimentação": nenhum documento de negócio nem
   * registro de folha/ponto pode existir pra empresa. Lista mínima
   * pedida (Sale/Purchase/SalesOrder/PurchaseOrder/Quote/
   * FinancialEntry/StockMovement/folha/ponto) — acrescentei Quotation
   * (cotação), InventoryCount (contagem de inventário), ProductionOrder
   * (ordem de produção) e PpeDelivery (entrega de EPI) por serem também
   * atividade real da empresa, mesma lógica de segurança (decisão do
   * desenvolvedor-backend, documentada no handoff).
   *
   * `FinancialEntry` só conta o que o CLIENTE lançou — o título que a
   * própria plataforma gera pra mensalidade
   * (`billingChargeId` preenchido, criado por
   * `BillingService.syncFinancialEntry`) NÃO bloqueia, senão nenhuma
   * empresa que já testou um pagamento seria excluível de novo, que é
   * justamente o caso de uso original deste recurso.
   *
   * `Budget` (orçamento financeiro/planejamento) e `BillingCharge`
   * (histórico de cobranças, que cascade a partir de `CompanyPlan`)
   * propositalmente NÃO entram nesta lista — bloquear por causa deles
   * teria o mesmo efeito colateral do `FinancialEntry` automático
   * acima. Excluir uma empresa com `BillingCharge` apaga esse histórico
   * de cobrança local sem aviso — aceitável, já que o Asaas mantém o
   * histórico real de cobrança fora daqui.
   */
  private async assertNoMovement(companyId: string): Promise<void> {
    const checks: MovementCheck[] = [
      { label: 'venda(s)', count: () => this.prisma.sale.count({ where: { companyId } }) },
      { label: 'compra(s)', count: () => this.prisma.purchase.count({ where: { companyId } }) },
      { label: 'pedido(s) de venda', count: () => this.prisma.salesOrder.count({ where: { companyId } }) },
      { label: 'pedido(s) de compra', count: () => this.prisma.purchaseOrder.count({ where: { companyId } }) },
      { label: 'orçamento(s) comercial(is)', count: () => this.prisma.quote.count({ where: { companyId } }) },
      { label: 'cotação(ões)', count: () => this.prisma.quotation.count({ where: { companyId } }) },
      {
        label: 'lançamento(s) financeiro(s)',
        count: () =>
          this.prisma.financialEntry.count({
            where: { companyId, billingChargeId: null },
          }),
      },
      { label: 'movimentação(ões) de estoque', count: () => this.prisma.stockMovement.count({ where: { companyId } }) },
      { label: 'contagem(ns) de inventário', count: () => this.prisma.inventoryCount.count({ where: { companyId } }) },
      { label: 'ordem(ns) de produção', count: () => this.prisma.productionOrder.count({ where: { companyId } }) },
      { label: 'entrega(s) de EPI', count: () => this.prisma.ppeDelivery.count({ where: { companyId } }) },
      { label: 'folha(s) de pagamento', count: () => this.prisma.payroll.count({ where: { companyId } }) },
      { label: '13º salário(s)', count: () => this.prisma.thirteenthSalary.count({ where: { companyId } }) },
      { label: 'gozo(s) de férias', count: () => this.prisma.vacationGrant.count({ where: { companyId } }) },
      { label: 'registro(s) de ponto', count: () => this.prisma.timeEntry.count({ where: { companyId } }) },
      { label: 'falta(s)/abono(s)', count: () => this.prisma.absenceRecord.count({ where: { companyId } }) },
    ];

    const results = await Promise.all(
      checks.map(async (check) => ({
        label: check.label,
        count: await check.count(),
      })),
    );

    const findings = results.filter((result) => result.count > 0);

    if (findings.length > 0) {
      const detail = findings
        .map((finding) => `${finding.count} ${finding.label}`)
        .join(', ');

      throw new ConflictException(
        `Não é possível excluir: a empresa tem ${detail}. Só é permitido excluir empresa sem nenhuma movimentação.`,
      );
    }
  }
}
