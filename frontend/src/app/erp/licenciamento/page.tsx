"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  CreditCard,
  Loader2,
  Package,
  X,
  type LucideIcon,
} from "lucide-react";

import { OsShell } from "@/components";
import { PaymentCheckout } from "@/components/billing/PaymentCheckout";

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

/** Mesmo mínimo do backend (CompanyOnboardingService/LicenseService) — só efeito visual aqui, quem garante de verdade é o servidor. */
const MINIMUM_MODULE_CODES = ["BPS", "PRODUCTS", "INVENTORY", "SALES", "PURCHASE"];

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
  const [basePrice, setBasePrice] = useState({ monthly: 0, yearly: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([licenseService.listModules(), licenseService.listPlans()])
      .then(([list, plans]) => {
        setModules(list);

        // Módulos mínimos do Customizado são os mesmos do Essencial — o
        // total parte do preço dele, não de zero.
        const essencial = plans.find((p) => p.code === "ESSENCIAL");
        setBasePrice({
          monthly: num(essencial?.monthlyPrice),
          yearly: num(essencial?.yearlyPrice),
        });

        setSelected(
          new Set([
            ...list
              .filter((m) => MINIMUM_MODULE_CODES.includes(m.code))
              .map((m) => m.id),
            ...currentModuleIds,
          ])
        );
      })
      .catch(() => setError("Não foi possível carregar os módulos."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(mod: LicenseModule) {
    if (MINIMUM_MODULE_CODES.includes(mod.code)) {
      return;
    }

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
    .filter((m) => selected.has(m.id) && !MINIMUM_MODULE_CODES.includes(m.code))
    .reduce((sum, m) => sum + num(m.monthlyPrice), 0);

  const addOnsYearly = modules
    .filter((m) => selected.has(m.id) && !MINIMUM_MODULE_CODES.includes(m.code))
    .reduce((sum, m) => sum + num(m.yearlyPrice), 0);

  const totalMonthly = basePrice.monthly + addOnsMonthly;
  const totalYearly = basePrice.yearly + addOnsYearly;

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
              Cadastros, Produtos, Estoque, Vendas e Compras vêm sempre
              incluídos. Marque o resto conforme sua empresa precisar —
              isso vira o seu Plano Customizado.
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
                const isMinimum = MINIMUM_MODULE_CODES.includes(mod.code);
                const checked = selected.has(mod.id);

                return (
                  <label
                    key={mod.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
                      checked
                        ? "border-[var(--primary)]"
                        : "border-[var(--border)]"
                    } ${isMinimum ? "opacity-80" : "cursor-pointer hover:border-[var(--border-strong)]"}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isMinimum}
                        onChange={() => toggle(mod)}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />

                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {mod.name}
                        </p>
                        {isMinimum && (
                          <p className="text-xs text-[var(--text-muted)]">
                            Incluído
                          </p>
                        )}
                      </div>
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
                  Base (Cadastros, Produtos, Estoque, Vendas e Compras) +{" "}
                  {money(addOnsMonthly)} em módulos extras
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
                      20% off
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

export default function LicenciamentoPage() {
  const [license, setLicense] = useState<MyLicense | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contractOpen, setContractOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);

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
  }

  useEffect(() => {
    loadLicense();
  }, []);

  const status = license?.companyPlan?.status;
  const canContract = status && status !== "ACTIVE";
  const modules = license ? moduleRows(license) : [];

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
    </OsShell>
  );
}
