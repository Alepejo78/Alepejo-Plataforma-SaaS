"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Mail,
  Plus,
  RotateCcw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SearchSelect } from "@/components/ui/SearchSelect";

import { employeeService, type Employee } from "@/services/hr.service";
import { PAYROLL_CONFIRMATION_STATUS_LABELS } from "@/services/payroll.service";
import {
  SALARY_ADVANCE_STATUS_LABELS,
  formatSalaryAdvanceNumber,
  salaryAdvanceService,
  type SalaryAdvance,
} from "@/services/salary-advance.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
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

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  APPROVED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

function emptyForm() {
  return {
    employeeId: "",
    employeeLabel: "",
    amount: 0,
    installments: 1,
    observation: "",
  };
}

export default function AdiantamentosPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await salaryAdvanceService.list();

      setAdvances(result);
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível carregar os adiantamentos.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const searchEmployees = useCallback(async (query: string) => {
    return employeeService.list({ search: query || undefined, limit: 20 });
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setFormError("");
    setFormOpen(true);
  }

  async function save() {
    if (!form.employeeId || form.amount <= 0) {
      setFormError("Selecione o colaborador e informe o valor.");

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await salaryAdvanceService.create({
        employeeId: form.employeeId,
        amount: form.amount,
        installments: form.installments,
        observation: form.observation || undefined,
      });

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível registrar o adiantamento.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    id: string,
    action: (id: string) => Promise<unknown>,
    fallback: string
  ) {
    setActionId(id);
    setActionError("");

    try {
      await action(id);
      await load();
    } catch (err) {
      setActionError(extractMessage(err, fallback));
    } finally {
      setActionId("");
    }
  }

  async function confirmItem(advance: SalaryAdvance) {
    if (
      !window.confirm(
        `Confirmar que "${advance.employee?.name}" recebeu este adiantamento? Isso registra a confirmação como assinatura digital.`
      )
    ) {
      return;
    }

    await runAction(
      advance.id,
      salaryAdvanceService.confirmItem,
      "Não foi possível confirmar o recebimento."
    );
  }

  async function sendConfirmation(advance: SalaryAdvance) {
    setActionId(advance.id);
    setActionError("");

    try {
      const result = await salaryAdvanceService.sendConfirmation(advance.id);

      const channelLabel = result.channels
        .map((c) => (c === "email" ? "e-mail" : "WhatsApp"))
        .join(" e ");

      window.alert(
        result.sent
          ? `Link de confirmação enviado por ${channelLabel}.`
          : "Não foi possível enviar por nenhum canal — confira se o e-mail/WhatsApp do colaborador está cadastrado."
      );

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível enviar o link de confirmação.")
      );
    } finally {
      setActionId("");
    }
  }

  return (
    <AppShell workspaceLabel="Adiantamento Salarial">
      <ListPageLayout
        header={
          <>
            <header>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Adiantamento Salarial
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Antecipação de parte do salário a pedido do colaborador.
                    O desconto na folha normal é lançado manualmente (ajuste
                    do item, &quot;Outros descontos&quot;) — este módulo só
                    registra e paga o adiantamento em si.
                  </p>
                </div>

                <div className="flex gap-2">
                  <ExportButton
                    tableRef={exportTableRef}
                    filename="adiantamentos-salariais"
                    sheetName="Adiantamentos"
                  />

                  <Can permission="salary-advance.create">
                    <button
                      type="button"
                      onClick={openCreate}
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                    >
                      <Plus size={18} />
                      Novo adiantamento
                    </button>
                  </Can>
                </div>
              </div>
            </header>

            {listError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {listError}
              </div>
            )}

            {actionError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {actionError}
              </div>
            )}
          </>
        }
      >
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : advances.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum adiantamento registrado
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Novo adiantamento&quot; para registrar o primeiro.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Número</th>
                  <th className="px-4 py-3 font-semibold">Colaborador</th>
                  <th className="px-4 py-3 font-semibold">Solicitado em</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Parcelas
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Confirmação</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {advances.map((a) => {
                  const busy = actionId === a.id;
                  const paid = a.financialEntry?.status === "PAID";

                  return (
                    <tr key={a.id} className="border-t border-[var(--border)]">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatSalaryAdvanceNumber(a.number)}
                      </td>

                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {a.employee?.name}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(a.requestDate)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(a.amount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {a.installments}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[a.status]}`}
                        >
                          {SALARY_ADVANCE_STATUS_LABELS[a.status]}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            a.confirmationStatus === "CONFIRMADO"
                              ? "bg-[var(--success-soft)] text-[var(--success)]"
                              : "bg-[var(--warning-soft)] text-[var(--warning)]"
                          }`}
                        >
                          {PAYROLL_CONFIRMATION_STATUS_LABELS[a.confirmationStatus]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {a.confirmationStatus === "PENDENTE" && paid && (
                            <Can permission="salary-advance.confirm-item">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void sendConfirmation(a)}
                                title="Enviar link de confirmação por e-mail/WhatsApp"
                                aria-label="Enviar confirmação"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                              >
                                <Mail size={16} />
                              </button>

                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void confirmItem(a)}
                                title="Confirmar recebimento manualmente"
                                aria-label="Confirmar recebimento"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-50"
                              >
                                <Check size={16} />
                              </button>
                            </Can>
                          )}

                          {a.status === "DRAFT" && (
                            <>
                              <Can permission="salary-advance.approve">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      a.id,
                                      salaryAdvanceService.approve,
                                      "Não foi possível aprovar."
                                    )
                                  }
                                  title="Aprovar (gera título a pagar)"
                                  aria-label="Aprovar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                                >
                                  <Check size={16} />
                                </button>
                              </Can>

                              <Can permission="salary-advance.cancel">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      a.id,
                                      salaryAdvanceService.cancel,
                                      "Não foi possível cancelar."
                                    )
                                  }
                                  title="Cancelar"
                                  aria-label="Cancelar"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                </button>
                              </Can>
                            </>
                          )}

                          {a.status === "APPROVED" && (
                            <Can permission="salary-advance.approve">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    a.id,
                                    salaryAdvanceService.reverse,
                                    "Não foi possível estornar."
                                  )
                                }
                                title="Estornar aprovação (volta a aguardar aprovação)"
                                aria-label="Estornar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <RotateCcw size={16} />
                              </button>
                            </Can>
                          )}

                          {a.status === "CANCELLED" && (
                            <Can permission="salary-advance.delete">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      "Excluir este adiantamento? Não pode ser desfeito."
                                    )
                                  ) {
                                    return;
                                  }

                                  void runAction(
                                    a.id,
                                    salaryAdvanceService.remove,
                                    "Não foi possível excluir."
                                  );
                                }}
                                title="Excluir"
                                aria-label="Excluir"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </Can>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Novo adiantamento salarial
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
              <div>
                <label className={labelClass}>Colaborador</label>

                <SearchSelect<Employee>
                  displayLabel={form.employeeLabel}
                  search={searchEmployees}
                  getId={(e) => e.id}
                  getLabel={(e) => e.name}
                  placeholder="Digite para buscar o colaborador..."
                  onSelect={(e) =>
                    setForm({
                      ...form,
                      employeeId: e?.id ?? "",
                      employeeLabel: e?.name ?? "",
                    })
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Valor (R$)</label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.amount}
                    onChange={(value) => setForm({ ...form, amount: value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Parcelas previstas p/ desconto
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={12}
                    className={fieldClass}
                    value={form.installments}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        installments: Number(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Observação</label>

                <input
                  className={fieldClass}
                  value={form.observation}
                  onChange={(e) =>
                    setForm({ ...form, observation: e.target.value })
                  }
                />
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
                  onClick={() => void save()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
