"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock,
  CreditCard,
  ExternalLink,
  Loader2,
  Package,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";

import { OsShell } from "@/components";
import { PaymentCheckout } from "@/components/billing/PaymentCheckout";
import { useAuth } from "@/providers/AuthProvider";

import {
  billingService,
  type BillingChargeRow,
  type ChargeStatus,
  type ChargeType,
} from "@/services/billing.service";

import {
  companyOnboardingService,
  type PublicPlan,
} from "@/services/company-onboarding.service";

import {
  licenseService,
  type CompanyPlanLicense,
  type CompanyPlanStatus,
  type LicenseModule,
  type ModuleLicenseStatus,
  type MyLicense,
} from "@/services/license.service";

const STATUS_LABELS: Record<CompanyPlanStatus, string> = {
  TRIAL: "Período de teste",
  ACTIVE: "Ativo",
  PAST_DUE: "Pagamento pendente",
  BLOCKED: "Bloqueado",
  CANCELLED: "Cancelado",
};

const STATUS_BADGE_CLASS: Record<CompanyPlanStatus, string> = {
  TRIAL: "bg-[var(--warning-soft)] text-[var(--warning)]",
  ACTIVE: "bg-[var(--success-soft)] text-[var(--success)]",
  PAST_DUE: "bg-[var(--warning-soft)] text-[var(--warning)]",
  BLOCKED: "bg-[var(--danger-soft)] text-[var(--danger)]",
  CANCELLED: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
};

/** Como cada situação de fatura aparece na tela de Cobranças. */
const CHARGE_STATE: Record<
  ChargeStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "A pagar",
    className: "bg-[var(--warning-soft)] text-[var(--warning)]",
  },
  CONFIRMED: {
    label: "Paga",
    className: "bg-[var(--success-soft)] text-[var(--success)]",
  },
  RECEIVED: {
    label: "Paga",
    className: "bg-[var(--success-soft)] text-[var(--success)]",
  },
  OVERDUE: {
    label: "Vencida",
    className: "bg-[var(--danger-soft)] text-[var(--danger)]",
  },
  REFUNDED: {
    label: "Estornada",
    className: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  },
  CANCELLED: {
    label: "Cancelada",
    className: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  },
};

const CHARGE_TYPE_LABEL: Record<ChargeType, string> = {
  SUBSCRIPTION: "Mensalidade",
  SETUP_FEE: "Taxa de implantação",
  ADDON: "Módulo adicional",
};

/** Uma linha da lista de módulos, venha ela do plano ou de um módulo avulso. */
interface ModuleRow {
  key: string;
  name: string;
  status: ModuleLicenseStatus;
  expiresAt: string | null;
}

/**
 * A situação dos módulos que vêm do plano é a situação do próprio
 * plano — mesma regra do backend (`moduleLicenseStatus`) para quem já
 * está coberto por uma contratação.
 */
function planModuleStatus(
  companyPlan: CompanyPlanLicense
): ModuleLicenseStatus {
  if (companyPlan.expired) {
    return "EXPIRED";
  }

  if (companyPlan.status === "TRIAL") {
    return "TRIAL";
  }

  return companyPlan.status === "ACTIVE" ? "ACTIVE" : "EXPIRED";
}

/**
 * A lista que o cliente vê junta as duas origens do acesso:
 *
 * - os módulos que o plano contratado já dá (Essencial, Profissional…),
 * - os habilitados individualmente (Customizado, ou extra acrescentado
 *   depois — esses trazem o próprio status, incluindo "A contratar").
 *
 * Sem juntar, quem assina um plano pronto via a seção vazia com um
 * "nenhum módulo habilitado individualmente" — verdadeiro, mas parecia
 * que a compra não tinha valido nada.
 */
function moduleRows(license: MyLicense): ModuleRow[] {
  const rows: ModuleRow[] = [];
  const jaListados = new Set<string>();

  for (const item of license.companyModules) {
    jaListados.add(item.moduleId);
    rows.push({
      key: item.id,
      name: item.module.name,
      status: item.licenseStatus,
      expiresAt: item.expiresAt,
    });
  }

  const doPlano = license.companyPlan?.plan?.planModules ?? [];

  for (const item of doPlano) {
    if (!item.included || jaListados.has(item.module.id)) {
      continue;
    }

    rows.push({
      key: `plano-${item.module.id}`,
      name: item.module.name,
      status: planModuleStatus(license.companyPlan!),
      expiresAt: null,
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Como cada situação de módulo aparece na lista. Quem decide a
 * situação é o backend (`LicenseService.moduleLicenseStatus`) — aqui
 * só traduz pra texto/cor/ícone.
 */
const MODULE_STATE: Record<
  ModuleLicenseStatus,
  { label: string; color: string; icon: LucideIcon }
> = {
  ACTIVE: {
    label: "Ativo",
    color: "text-[var(--success)]",
    icon: CheckCircle2,
  },
  TRIAL: {
    label: "Período de teste",
    color: "text-[var(--warning)]",
    icon: Clock,
  },
  EXPIRED: {
    label: "Expirou",
    color: "text-[var(--danger)]",
    icon: AlertTriangle,
  },
  TO_CONTRACT: {
    label: "A contratar",
    color: "text-[var(--text-muted)]",
    icon: CircleDashed,
  },
  DISABLED: {
    label: "Inativo",
    color: "text-[var(--text-muted)]",
    icon: CircleDashed,
  },
};

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

/**
 * A data que importa mudar conforme o status: em teste, é
 * `trialEndsAt`; pago em dia, é `currentPeriodEnd` (calculado pelo
 * ciclo — mensal ou anual — quando o pagamento é confirmado, ver
 * BillingService.handleWebhook no backend); vencido, é o próprio
 * `currentPeriodEnd` que já passou. `endDate` é só pra cancelamento
 * definitivo, raramente usado.
 */
function expiryInfo(companyPlan: CompanyPlanLicense): {
  label: string;
  date: string | null;
} {
  switch (companyPlan.status) {
    case "TRIAL":
      return { label: "Teste expira em", date: companyPlan.trialEndsAt ?? null };
    case "ACTIVE":
      return {
        label:
          companyPlan.billingCycle === "YEARLY"
            ? "Renova em (anual)"
            : "Renova em (mensal)",
        date: companyPlan.currentPeriodEnd ?? null,
      };
    case "PAST_DUE":
      return { label: "Venceu em", date: companyPlan.currentPeriodEnd ?? null };
    default:
      return { label: "Expira em", date: companyPlan.endDate };
  }
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function ContractModal({
  onClose,
  onContracted,
}: {
  onClose: () => void;
  onContracted: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Contratar assinatura
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        <PaymentCheckout
          onCharged={onContracted}
          finalLabel="Fechar"
          onFinal={onClose}
        />
      </div>
    </div>
  );
}

function ChooseModulesModal({
  currentModuleIds,
  onClose,
  onSaved,
}: {
  currentModuleIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [modules, setModules] = useState<LicenseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    licenseService
      .listModules()
      .then((list) => {
        setModules(list);
        setSelected(new Set(currentModuleIds));
      })
      .catch(() => setError("Não foi possível carregar os módulos."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(mod: LicenseModule) {
    setSelected((previous) => {
      const next = new Set(previous);

      if (next.has(mod.id)) {
        next.delete(mod.id);
      } else {
        next.add(mod.id);
      }

      return next;
    });
  }

  const addOnsMonthly = modules
    .filter((m) => selected.has(m.id))
    .reduce((sum, m) => sum + num(m.monthlyPrice), 0);

  const addOnsYearly = modules
    .filter((m) => selected.has(m.id))
    .reduce((sum, m) => sum + num(m.yearlyPrice), 0);

  // Sem taxa-piso: zero módulo escolhido é zero reais (mesma regra do
  // backend, ver `BillingService.customPlanPriceFromModules`).
  const totalMonthly = addOnsMonthly;
  const totalYearly = addOnsYearly;

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      await licenseService.setCustomModules(Array.from(selected));
      onSaved();
      onClose();
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível salvar os módulos.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Módulos da sua empresa
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Marque os módulos que sua empresa vai usar — sem
              obrigatoriedade nenhuma. Isso vira o seu Plano Customizado.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        )}

        {!loading && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((mod) => {
                const checked = selected.has(mod.id);

                return (
                  <label
                    key={mod.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--border-strong)] ${
                      checked
                        ? "border-[var(--primary)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(mod)}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />

                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {mod.name}
                      </p>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                      {num(mod.monthlyPrice) > 0
                        ? `+ ${money(num(mod.monthlyPrice))}/mês`
                        : "Incluso"}
                    </span>
                  </label>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  {selected.size} módulo(s) escolhido(s)
                </p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {money(totalMonthly)}
                  <span className="text-sm font-normal text-[var(--text-muted)]">
                    {" "}
                    /mês
                  </span>
                </p>
                {totalYearly > 0 && (
                  <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    ou {money(totalYearly)}/ano
                    <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--success)]">
                      com desconto
                    </span>
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Salvar {selected.size} módulo(s)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChangePlanModal({
  currentPlanId,
  billingCycle,
  onClose,
  onChanged,
  onWantCustom,
}: {
  currentPlanId: string;
  billingCycle: "MONTHLY" | "YEARLY";
  onClose: () => void;
  onChanged: (message: string) => void;
  onWantCustom: () => void;
}) {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    companyOnboardingService
      .listPublicPlans()
      .then(setPlans)
      .catch(() => setError("Não foi possível carregar os planos."))
      .finally(() => setLoading(false));
  }, []);

  const fixedPlans = plans
    .filter((p) => p.code !== "CUSTOM")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  async function escolher(plan: PublicPlan) {
    if (plan.id === currentPlanId || changingId) {
      return;
    }

    const preco = num(
      billingCycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice
    );

    const aviso =
      `Trocar para o plano ${plan.name} (${money(preco)}/${
        billingCycle === "YEARLY" ? "ano" : "mês"
      })?\n\n` +
      "Uma cobrança com o valor do plano novo é gerada agora para pagamento. A assinatura atual é encerrada.";

    if (!window.confirm(aviso)) {
      return;
    }

    setChangingId(plan.id);
    setError("");

    try {
      const result = await billingService.changePlan(plan.id);

      onChanged(
        result.cobrancaImediata
          ? `Pronto. Plano trocado para ${result.planName} — a cobrança de ${money(result.value)} aparece em Cobranças.`
          : `Pronto. Plano trocado para ${result.planName}. Como você ainda está em teste, nada foi cobrado.`
      );

      onClose();
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível trocar de plano.")
      );
    } finally {
      setChangingId("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Trocar de plano
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Preços {billingCycle === "YEARLY" ? "anuais" : "mensais"} —
              iguais à sua forma de cobrança atual.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {!loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fixedPlans.map((plan) => {
              const atual = plan.id === currentPlanId;
              const preco = num(
                billingCycle === "YEARLY"
                  ? plan.yearlyPrice
                  : plan.monthlyPrice
              );
              const busy = changingId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border p-5 ${
                    atual
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {plan.name}
                    </p>

                    {plan.highlighted && !atual && (
                      <Star
                        size={14}
                        className="fill-[var(--warning)] text-[var(--warning)]"
                      />
                    )}
                  </div>

                  {plan.description && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {plan.description}
                    </p>
                  )}

                  <p className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                    {money(preco)}
                    <span className="text-sm font-normal text-[var(--text-muted)]">
                      /{billingCycle === "YEARLY" ? "ano" : "mês"}
                    </span>
                  </p>

                  <ul className="mt-4 flex-1 space-y-1.5">
                    {(plan.planModules ?? [])
                      .filter((pm) => pm.included)
                      .map((pm) => (
                        <li
                          key={pm.module.id}
                          className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                        >
                          <Check
                            size={13}
                            className="shrink-0 text-[var(--success)]"
                          />
                          {pm.module.name}
                        </li>
                      ))}
                  </ul>

                  <button
                    type="button"
                    disabled={atual || busy}
                    onClick={() => void escolher(plan)}
                    className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    {busy && <Loader2 size={15} className="animate-spin" />}
                    {atual ? "Plano atual" : "Escolher este plano"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!loading && (
          <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
            Prefere montar do seu jeito?{" "}
            <button
              type="button"
              onClick={onWantCustom}
              className="font-medium text-[var(--primary)] hover:underline"
            >
              Escolher módulos avulsos (Plano Customizado)
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LicenciamentoPage() {
  const { refreshUser } = useAuth();

  const [license, setLicense] = useState<MyLicense | null>(
    null
  );

  const [charges, setCharges] = useState<BillingChargeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contractOpen, setContractOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [changingCycle, setChangingCycle] = useState(false);
  const [cycleMessage, setCycleMessage] = useState("");
  const [cycleError, setCycleError] = useState("");
  const [planMessage, setPlanMessage] = useState("");

  function loadLicense() {
    licenseService
      .me()
      .then(setLicense)
      .catch(() => {
        setError(
          "Não foi possível carregar as informações de licenciamento."
        );
      })
      .finally(() => setLoading(false));

    // Falhar aqui não pode esconder o plano: a seção de cobranças
    // some, o resto da tela continua.
    billingService
      .listCharges()
      .then(setCharges)
      .catch(() => setCharges([]));

    // O menu/permissões do usuário (guardados no AuthProvider) só
    // atualizam sozinhos no próximo login — sem isso, quem troca de
    // plano/módulo continua vendo o menu antigo até relogar, mesmo já
    // tendo o acesso liberado/bloqueado de verdade no backend.
    void refreshUser();
  }

  useEffect(() => {
    loadLicense();
  }, []);

  const status = license?.companyPlan?.status;
  const canContract = status && status !== "ACTIVE";
  const modules = license ? moduleRows(license) : [];

  const anual = license?.companyPlan?.billingCycle === "YEARLY";

  /*
   * Só quem já assinou pode trocar de ciclo — em teste não existe
   * assinatura no Asaas pra encerrar e recriar, e o backend recusaria.
   */
  const podeTrocarCiclo = status === "ACTIVE" || status === "PAST_DUE";

  async function trocarCiclo() {
    const destino = anual ? "MONTHLY" : "YEARLY";

    const aviso = anual
      ? "Voltar para a cobrança mensal?\n\nVocê continua no plano anual até o fim do período já pago. A partir daí, a cobrança passa a ser mensal. Nada é cobrado agora e nada é devolvido."
      : "Mudar para a cobrança anual?\n\nUma cobrança do valor anual, já com desconto, é gerada agora para pagamento. O período mensal que você já pagou continua valendo até vencer.";

    if (!window.confirm(aviso)) {
      return;
    }

    setChangingCycle(true);
    setCycleMessage("");
    setCycleError("");

    try {
      const result = await billingService.changeCycle(destino);

      setCycleMessage(
        result.cobrancaImediata
          ? `Pronto. A cobrança anual de ${money(result.value)} foi gerada e aparece abaixo, em Cobranças.`
          : `Pronto. A cobrança mensal de ${money(result.value)} começa em ${formatDate(result.dueDate)}.`
      );

      loadLicense();
    } catch (err) {
      setCycleError(
        extractMessage(err, "Não foi possível trocar a forma de cobrança.")
      );
    } finally {
      setChangingCycle(false);
    }
  }

  return (
    <OsShell workspaceLabel="Licenciamento">
      <div className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Licenciamento
            </h1>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Plano contratado e módulos disponíveis para sua
              empresa.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModulesOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            >
              <Package size={18} />
              Módulos
            </button>

            {license?.companyPlan && (
              <button
                type="button"
                onClick={() => setChangePlanOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              >
                <ArrowLeftRight size={18} />
                Trocar de plano
              </button>
            )}

            {canContract && (
              <button
                type="button"
                onClick={() => setContractOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                <CreditCard size={18} />
                Contratar
              </button>
            )}

          </div>
        </header>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {!loading && !error && license && (
          <>
            <section className="rounded-2xl border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)]">
                Plano atual
              </h2>

              {license.companyPlan ? (
                <div className="mt-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {license.companyPlan.plan.name}
                    </p>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        license.companyPlan.expired
                          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                          : STATUS_BADGE_CLASS[license.companyPlan.status]
                      }`}
                    >
                      {license.companyPlan.expired
                        ? license.companyPlan.status === "TRIAL"
                          ? "Teste expirado"
                          : "Expirado"
                        : STATUS_LABELS[license.companyPlan.status]}
                    </span>
                  </div>

                  {license.companyPlan.plan.description && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {license.companyPlan.plan.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-6 text-sm text-[var(--text-muted)]">
                    <span>
                      Início:{" "}
                      {formatDate(
                        license.companyPlan.startDate
                      ) ?? "—"}
                    </span>

                    <span>
                      {expiryInfo(license.companyPlan).label}:{" "}
                      {formatDate(expiryInfo(license.companyPlan).date) ??
                        "sem data definida"}
                    </span>

                    {license.companyPlan.status === "PAST_DUE" &&
                      license.companyPlan.graceUntil && (
                        <span className="text-[var(--warning)]">
                          Tolerância até:{" "}
                          {formatDate(license.companyPlan.graceUntil)}
                        </span>
                      )}
                  </div>

                  {podeTrocarCiclo && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Forma de cobrança:{" "}
                          {anual ? "anual" : "mensal"}
                        </p>

                        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                          {anual
                            ? "Voltando para o mensal, a mudança só vale quando o período já pago terminar — nada é cobrado agora."
                            : "No plano anual você paga 12 meses de uma vez, com desconto. A cobrança sai na hora."}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={changingCycle}
                        onClick={() => void trocarCiclo()}
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
                      >
                        {changingCycle && (
                          <Loader2 size={15} className="animate-spin" />
                        )}
                        {anual
                          ? "Voltar para mensal"
                          : "Mudar para anual"}
                      </button>
                    </div>
                  )}

                  {planMessage && (
                    <p className="mt-3 rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
                      {planMessage}
                    </p>
                  )}

                  {cycleMessage && (
                    <p className="mt-3 rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
                      {cycleMessage}
                    </p>
                  )}

                  {cycleError && (
                    <p className="mt-3 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                      {cycleError}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[var(--text-muted)]">
                  Nenhum plano contratado.
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
                Módulos da sua empresa
              </h2>

              {modules.length === 0 ? (
                <p className="text-[var(--text-muted)]">
                  Nenhum módulo habilitado ainda.
                </p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {modules.map((item) => {
                    const state = MODULE_STATE[item.status];
                    const Icon = state.icon;

                    return (
                      <li
                        key={item.key}
                        className="flex items-start gap-3 rounded-2xl border border-[var(--border)] p-4"
                      >
                        <Icon
                          size={18}
                          className={`mt-0.5 shrink-0 ${state.color}`}
                        />

                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text-primary)]">
                            {item.name}
                          </p>

                          <p className={`text-sm ${state.color}`}>
                            {state.label}

                            {item.expiresAt &&
                              ` · até ${formatDate(
                                item.expiresAt
                              )}`}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {charges.length > 0 && (
              <section>
                <h2 className="mb-1 text-sm font-medium text-[var(--text-muted)]">
                  Cobranças
                </h2>

                <p className="mb-3 text-sm text-[var(--text-muted)]">
                  Cada cobrança também vira uma conta a pagar no
                  Financeiro da sua empresa.
                </p>

                <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        <th className="px-4 py-3 font-medium">Vencimento</th>
                        <th className="px-4 py-3 font-medium">Descrição</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Valor
                        </th>
                        <th className="px-4 py-3 font-medium">Situação</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {charges.map((charge) => {
                        const state = CHARGE_STATE[charge.status];
                        const emAberto =
                          charge.status === "PENDING" ||
                          charge.status === "OVERDUE";
                        const link =
                          charge.invoiceUrl ?? charge.bankSlipUrl;

                        return (
                          <tr
                            key={charge.id}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-[var(--text-primary)]">
                              {formatDate(charge.dueDate)}
                            </td>

                            <td className="px-4 py-3 text-[var(--text-secondary)]">
                              {CHARGE_TYPE_LABEL[charge.type]}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                              {money(num(charge.value))}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${state.className}`}
                              >
                                {state.label}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {emAberto && link && (
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                                  >
                                    Pagar
                                    <ExternalLink size={13} />
                                  </a>
                                )}

                                {charge.invoiceUrl && (
                                  <a
                                    href={charge.invoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                                  >
                                    Ver fatura
                                    <ExternalLink size={13} />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  As cobranças dos próximos períodos são geradas
                  automaticamente antes do vencimento e também chegam
                  por e-mail. Dá para pagar antes do vencimento por aqui
                  mesmo, no botão Pagar.
                </p>
              </section>
            )}
          </>
        )}
      </div>

      {contractOpen && (
        <ContractModal
          onClose={() => {
            setContractOpen(false);
            loadLicense();
          }}
          onContracted={loadLicense}
        />
      )}

      {modulesOpen && (
        <ChooseModulesModal
          currentModuleIds={(license?.companyModules ?? []).map(
            (item) => item.moduleId
          )}
          onClose={() => setModulesOpen(false)}
          onSaved={loadLicense}
        />
      )}

      {changePlanOpen && license?.companyPlan && (
        <ChangePlanModal
          currentPlanId={license.companyPlan.plan.id}
          billingCycle={license.companyPlan.billingCycle}
          onClose={() => setChangePlanOpen(false)}
          onChanged={(message) => {
            setPlanMessage(message);
            setCycleMessage("");
            setCycleError("");
            loadLicense();
          }}
          onWantCustom={() => {
            setChangePlanOpen(false);
            setModulesOpen(true);
          }}
        />
      )}
    </OsShell>
  );
}
