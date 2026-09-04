"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Plus, ShieldOff, Star, X } from "lucide-react";

import { OsShell } from "@/components";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useAuth } from "@/providers/AuthProvider";

import {
  licenseService,
  type LicenseModule,
  type LicensePlan,
} from "@/services/license.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

interface PlanForm {
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  setupFee: number;
  maxUsers: string;
  sortOrder: number;
  highlighted: boolean;
  moduleIds: string[];
}

function emptyForm(nextSortOrder: number): PlanForm {
  return {
    code: "",
    name: "",
    description: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    setupFee: 0,
    maxUsers: "",
    sortOrder: nextSortOrder,
    highlighted: false,
    moduleIds: [],
  };
}

export default function PlanosAdminPage() {
  const { can } = useAuth();
  const allowed = can("platform.license.manage");

  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [modules, setModules] = useState<LicenseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm(1));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [moduleSaving, setModuleSaving] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [trialDays, setTrialDays] = useState("");
  const [trialDaysSaving, setTrialDaysSaving] = useState(false);
  const [trialDaysError, setTrialDaysError] = useState("");
  const [trialDaysSaved, setTrialDaysSaved] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setListError("");

    try {
      const [planList, moduleList, platformSettings] = await Promise.all([
        licenseService.listPlans(),
        licenseService.listModules(),
        licenseService.getPlatformSettings(),
      ]);

      setPlans(planList);
      setModules(moduleList);
      setTrialDays(String(platformSettings.trialDays));
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível carregar os planos.")
      );
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(plans.length + 1));
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(plan: LicensePlan) {
    setEditingId(plan.id);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      monthlyPrice: num(plan.monthlyPrice),
      yearlyPrice: num(plan.yearlyPrice),
      setupFee: num(plan.setupFee),
      maxUsers: plan.maxUsers ? String(plan.maxUsers) : "",
      sortOrder: plan.sortOrder ?? 0,
      highlighted: Boolean(plan.highlighted),
      moduleIds: (plan.planModules ?? [])
        .filter((pm) => pm.included)
        .map((pm) => pm.module.id),
    });
    setFormError("");
    setFormOpen(true);
  }

  function toggleModule(moduleId: string) {
    setForm((prev) => ({
      ...prev,
      moduleIds: prev.moduleIds.includes(moduleId)
        ? prev.moduleIds.filter((id) => id !== moduleId)
        : [...prev.moduleIds, moduleId],
    }));
  }

  async function savePlan() {
    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Informe o código e o nome do plano.");
      return;
    }

    setSaving(true);
    setFormError("");

    // Manda o valor como está, inclusive zero, e `null` pro que ficou
    // em branco. Usar `|| undefined` aqui fazia o campo sumir do envio
    // quando valia 0 — e campo ausente o Prisma não altera, então
    // zerar um preço ou tirar a taxa de implantação simplesmente não
    // pegava: a tela salvava sem erro e o valor antigo continuava lá.
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      monthlyPrice: form.monthlyPrice,
      yearlyPrice: form.yearlyPrice,
      setupFee: form.setupFee,
      maxUsers: form.maxUsers ? Number(form.maxUsers) : null,
      sortOrder: form.sortOrder,
      highlighted: form.highlighted,
      moduleIds: form.moduleIds,
    };

    try {
      if (editingId) {
        await licenseService.updatePlan(editingId, payload);
      } else {
        await licenseService.createPlan(payload);
      }

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível salvar o plano.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function removePlan(plan: LicensePlan) {
    if (
      !window.confirm(
        `Excluir o plano "${plan.name}"? Empresas já assinantes desse plano não são afetadas, mas ele deixa de aparecer pra novos clientes.`
      )
    ) {
      return;
    }

    setRemovingId(plan.id);
    setListError("");

    try {
      await licenseService.removePlan(plan.id);
      await load();
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível excluir o plano.")
      );
    } finally {
      setRemovingId(null);
    }
  }

  async function toggleActive(plan: LicensePlan) {
    setRemovingId(plan.id);
    setListError("");

    try {
      await licenseService.updatePlan(plan.id, { active: !plan.active });
      await load();
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível alterar a situação do plano."
        )
      );
    } finally {
      setRemovingId(null);
    }
  }

  async function saveTrialDays() {
    const days = Number(trialDays);

    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setTrialDaysError("Informe um número de dias entre 1 e 365.");
      return;
    }

    setTrialDaysSaving(true);
    setTrialDaysError("");
    setTrialDaysSaved(false);

    try {
      await licenseService.updatePlatformSettings(days);
      setTrialDaysSaved(true);
    } catch (err) {
      setTrialDaysError(
        extractMessage(err, "Não foi possível salvar.")
      );
    } finally {
      setTrialDaysSaving(false);
    }
  }

  /**
   * Só atualiza o valor local, sem chamar a API — chamar a cada tecla
   * digitada desabilitava o campo no meio da digitação (`moduleSaving`
   * via `disabled`), derrubando o usuário do campo antes de terminar
   * de digitar. O salvamento de verdade acontece só em
   * `saveModulePrice`, no blur.
   */
  function editModulePrice(
    moduleId: string,
    field: "monthlyPrice" | "yearlyPrice",
    value: number
  ) {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, [field]: value } : m))
    );
  }

  async function saveModulePrice(
    moduleId: string,
    field: "monthlyPrice" | "yearlyPrice"
  ) {
    const mod = modules.find((m) => m.id === moduleId);

    if (!mod) {
      return;
    }

    setModuleSaving(moduleId);

    try {
      const updated = await licenseService.updateModule(moduleId, {
        [field]: num(mod[field]),
      });

      setModules((prev) =>
        prev.map((m) => (m.id === moduleId ? updated : m))
      );
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível salvar o preço do módulo.")
      );
    } finally {
      setModuleSaving(null);
    }
  }

  const sortedPlans = [...plans].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  if (!allowed) {
    return (
      <OsShell workspaceLabel="Planos e preços">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] p-12 text-center">
          <ShieldOff size={32} className="text-[var(--text-muted)]" />

          <p className="font-medium text-[var(--text-primary)]">
            Acesso restrito
          </p>

          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Esta área é exclusiva da administração da plataforma.
          </p>
        </div>
      </OsShell>
    );
  }

  return (
    <OsShell workspaceLabel="Planos e preços">
      <div className="space-y-8">
        <header>
          <Link
            href="/os"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Voltar para OS
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Planos e preços
              </h1>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                O que cada plano inclui e quanto custa. Módulos fora de
                um plano podem ser vendidos avulsos (add-on).{" "}
                <Link
                  href="/erp/licenciamento/clientes"
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  Ver clientes e faturamento
                </Link>
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
            >
              <Plus size={18} />
              Novo plano
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Teste grátis
          </h2>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Quantos dias de teste grátis quem se cadastra escolhendo um
            plano comercial recebe, antes de precisar contratar.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-32">
              <label className={labelClass} htmlFor="trialDays">
                Dias
              </label>

              <input
                id="trialDays"
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => {
                  setTrialDays(e.target.value);
                  setTrialDaysSaved(false);
                }}
                className={fieldClass}
              />
            </div>

            <button
              type="button"
              disabled={trialDaysSaving}
              onClick={() => void saveTrialDays()}
              className="h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {trialDaysSaving ? "Salvando..." : "Salvar"}
            </button>

            {trialDaysSaved && !trialDaysError && (
              <span className="text-sm text-[var(--success)]">
                Salvo!
              </span>
            )}
          </div>

          {trialDaysError && (
            <p className="mt-2 text-sm text-[var(--danger)]">
              {trialDaysError}
            </p>
          )}
        </section>

        {listError && (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {listError}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-5 ${
                  plan.highlighted
                    ? "border-[var(--primary)] shadow-sm"
                    : "border-[var(--border)]"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-[var(--primary)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-contrast)]">
                    <Star size={12} />
                    Recomendado
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                    {plan.code}
                  </p>

                  {plan.active === false && (
                    <span className="rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--danger)]">
                      Inativo
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {plan.name}
                </h2>

                {plan.description && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {plan.description}
                  </p>
                )}

                <div className="mt-3 space-y-0.5">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {money(plan.monthlyPrice)}
                    <span className="text-sm font-normal text-[var(--text-muted)]">
                      {" "}
                      /mês
                    </span>
                  </p>

                  {num(plan.yearlyPrice) > 0 && (
                    <p className="text-sm text-[var(--text-muted)]">
                      ou {money(plan.yearlyPrice)}/ano
                    </p>
                  )}

                  {num(plan.setupFee) > 0 && (
                    <p className="text-sm text-[var(--text-muted)]">
                      + {money(plan.setupFee)} taxa de implantação
                    </p>
                  )}
                </div>

                {plan.maxUsers && (
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Até {plan.maxUsers} usuário(s)
                  </p>
                )}

                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {(plan.planModules ?? [])
                    .filter((pm) => pm.included)
                    .map((pm) => (
                      <li
                        key={pm.module.id}
                        className="flex items-center gap-2 text-[var(--text-secondary)]"
                      >
                        <Check
                          size={14}
                          className="shrink-0 text-[var(--success)]"
                        />
                        {pm.module.name}
                      </li>
                    ))}
                </ul>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(plan)}
                    className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    disabled={removingId === plan.id}
                    onClick={() => void toggleActive(plan)}
                    title={
                      plan.active === false
                        ? "Voltar a mostrar esse plano pra novos clientes"
                        : "Parar de mostrar esse plano pra novos clientes, sem excluir (empresas já assinantes não são afetadas)"
                    }
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                  >
                    {plan.active === false ? "Ativar" : "Desativar"}
                  </button>

                  <button
                    type="button"
                    disabled={removingId === plan.id}
                    onClick={() => void removePlan(plan)}
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-1 text-lg font-bold text-[var(--text-primary)]">
            Módulos avulsos (add-ons)
          </h2>

          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Preço de cada módulo quando contratado fora de um plano —
            ex.: Personalização (marca própria).
          </p>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Módulo</th>
                  <th className="px-4 py-3 font-semibold">Mensal</th>
                  <th className="px-4 py-3 font-semibold">Anual</th>
                </tr>
              </thead>

              <tbody>
                {modules.map((mod) => (
                  <tr
                    key={mod.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      {mod.name}
                    </td>

                    <td className="px-4 py-3">
                      <CurrencyInput
                        className={`${fieldClass} h-9 max-w-40`}
                        value={num(mod.monthlyPrice)}
                        disabled={moduleSaving === mod.id}
                        onChange={(value) =>
                          editModulePrice(mod.id, "monthlyPrice", value)
                        }
                        onBlur={() =>
                          void saveModulePrice(mod.id, "monthlyPrice")
                        }
                      />
                    </td>

                    <td className="px-4 py-3">
                      <CurrencyInput
                        className={`${fieldClass} h-9 max-w-40`}
                        value={num(mod.yearlyPrice)}
                        disabled={moduleSaving === mod.id}
                        onChange={(value) =>
                          editModulePrice(mod.id, "yearlyPrice", value)
                        }
                        onBlur={() =>
                          void saveModulePrice(mod.id, "yearlyPrice")
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingId ? "Editar plano" : "Novo plano"}
              </h2>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>Código</label>

                  <input
                    className={fieldClass}
                    value={form.code}
                    disabled={Boolean(editingId)}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value })
                    }
                  />
                </div>

                <div className="sm:col-span-1 lg:col-span-2">
                  <label className={labelClass}>Nome</label>

                  <input
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Ordem de exibição</label>

                  <input
                    type="number"
                    className={fieldClass}
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sortOrder: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className={labelClass}>Descrição</label>

                  <input
                    className={fieldClass}
                    value={form.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Preço mensal (R$)</label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.monthlyPrice}
                    onChange={(v) =>
                      setForm({ ...form, monthlyPrice: v })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Preço anual (R$)</label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.yearlyPrice}
                    onChange={(v) => setForm({ ...form, yearlyPrice: v })}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Taxa de implantação (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.setupFee}
                    onChange={(v) => setForm({ ...form, setupFee: v })}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Máx. de usuários (opcional)
                  </label>

                  <input
                    type="number"
                    className={fieldClass}
                    value={form.maxUsers}
                    onChange={(e) =>
                      setForm({ ...form, maxUsers: e.target.value })
                    }
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.highlighted}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      highlighted: e.target.checked,
                    })
                  }
                />
                Destacar como "Recomendado" na página de preços
              </label>

              <div>
                <label className={labelClass}>Módulos incluídos</label>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {modules.map((mod) => (
                    <label
                      key={mod.id}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text-secondary)]"
                    >
                      <input
                        type="checkbox"
                        checked={form.moduleIds.includes(mod.id)}
                        onChange={() => toggleModule(mod.id)}
                      />
                      {mod.name}
                    </label>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void savePlan()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </OsShell>
  );
}
