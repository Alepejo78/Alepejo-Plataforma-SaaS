"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  payrollSettingsService,
  payrollTaxTableService,
  type PayrollSettings,
  type PayrollTaxTable,
  type PayrollTaxType,
} from "@/services/payroll-settings.service";

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

interface BracketForm {
  taxType: PayrollTaxType;
  minBase: number;
  maxBase: number;
  rate: number;
  deduction: number;
}

function emptyBracket(taxType: PayrollTaxType): BracketForm {
  return { taxType, minBase: 0, maxBase: 0, rate: 0, deduction: 0 };
}

function emptyForm() {
  return {
    validFrom: "",
    fgtsPercentage: 8,
    dependentDeductionValue: 0,
    irrfReliefThreshold: 0,
    irrfReliefPhaseOutEnd: 0,
    irrfReliefBase: 0,
    irrfReliefFactor: 0,
  };
}

export default function ParametrosFiscaisPage() {
  const [tables, setTables] = useState<PayrollTaxTable[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [inssBrackets, setInssBrackets] = useState<BracketForm[]>([]);
  const [irrfBrackets, setIrrfBrackets] = useState<BracketForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const [tableList, settingsData] = await Promise.all([
        payrollTaxTableService.list(),
        payrollSettingsService.get(),
      ]);

      setTables(tableList);
      setSettings(settingsData);
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível carregar os parâmetros fiscais.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A tabela cresce muito (INSS + IRRF, várias faixas cada) e o
  // cabeçalho com o X rolava pra fora de vista — Esc garante uma
  // saída sempre disponível, mesmo rolado lá embaixo.
  useEffect(() => {
    if (!formOpen) {
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFormOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formOpen]);

  /**
   * Abre já preenchido com a vigência atual — na prática o usuário
   * cadastra a tabela do ano seguinte partindo dos valores do ano
   * corrente e só ajusta os números que mudaram.
   */
  function openCreate() {
    const current = tables.find((t) => !t.validTo) ?? tables[0];

    if (current) {
      setForm({
        validFrom: "",
        fgtsPercentage: num(current.fgtsPercentage),
        dependentDeductionValue: num(current.dependentDeductionValue),
        irrfReliefThreshold: num(current.irrfReliefThreshold),
        irrfReliefPhaseOutEnd: num(current.irrfReliefPhaseOutEnd),
        irrfReliefBase: num(current.irrfReliefBase),
        irrfReliefFactor: num(current.irrfReliefFactor),
      });

      const toForm = (taxType: PayrollTaxType) =>
        current.brackets
          .filter((b) => b.taxType === taxType)
          .sort((a, b) => a.order - b.order)
          .map((b) => ({
            taxType,
            minBase: num(b.minBase),
            maxBase: num(b.maxBase),
            rate: num(b.rate),
            deduction: num(b.deduction),
          }));

      setInssBrackets(toForm("INSS"));
      setIrrfBrackets(toForm("IRRF"));
    } else {
      setForm(emptyForm());
      setInssBrackets([emptyBracket("INSS")]);
      setIrrfBrackets([emptyBracket("IRRF")]);
    }

    setFormError("");
    setFormOpen(true);
  }

  async function saveSettings() {
    if (!settings) {
      return;
    }

    setSettingsSaving(true);
    setSettingsMessage("");

    try {
      const updated = await payrollSettingsService.update({
        extraHourSurchargePercentage: num(settings.extraHourSurchargePercentage),
        transportVoucherPercentage: num(settings.transportVoucherPercentage),
        thirteenthDefaultInstallments: settings.thirteenthDefaultInstallments,
      });

      setSettings(updated);
      setSettingsMessage("Configurações salvas.");
    } catch (err) {
      setSettingsMessage(
        extractMessage(err, "Não foi possível salvar as configurações.")
      );
    } finally {
      setSettingsSaving(false);
    }
  }

  async function saveTable() {
    if (!form.validFrom) {
      setFormError("Informe a data de início da vigência.");

      return;
    }

    const all = [...inssBrackets, ...irrfBrackets];

    if (all.length === 0) {
      setFormError("Cadastre ao menos uma faixa.");

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await payrollTaxTableService.create({
        validFrom: form.validFrom,
        fgtsPercentage: form.fgtsPercentage,
        dependentDeductionValue: form.dependentDeductionValue,
        irrfReliefThreshold: form.irrfReliefThreshold || undefined,
        irrfReliefPhaseOutEnd: form.irrfReliefPhaseOutEnd || undefined,
        irrfReliefBase: form.irrfReliefBase || undefined,
        irrfReliefFactor: form.irrfReliefFactor || undefined,
        brackets: [
          ...inssBrackets.map((b, i) => ({
            taxType: "INSS" as const,
            order: i + 1,
            minBase: b.minBase,
            maxBase: b.maxBase || undefined,
            rate: b.rate,
            deduction: b.deduction,
          })),
          ...irrfBrackets.map((b, i) => ({
            taxType: "IRRF" as const,
            order: i + 1,
            minBase: b.minBase,
            maxBase: b.maxBase || undefined,
            rate: b.rate,
            deduction: b.deduction,
          })),
        ],
      });

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(extractMessage(err, "Não foi possível salvar a tabela."));
    } finally {
      setSaving(false);
    }
  }

  function updateBracket(
    taxType: PayrollTaxType,
    index: number,
    patch: Partial<BracketForm>
  ) {
    const setter = taxType === "INSS" ? setInssBrackets : setIrrfBrackets;

    setter((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  }

  function addBracket(taxType: PayrollTaxType) {
    const setter = taxType === "INSS" ? setInssBrackets : setIrrfBrackets;

    setter((prev) => [...prev, emptyBracket(taxType)]);
  }

  function removeBracket(taxType: PayrollTaxType, index: number) {
    const setter = taxType === "INSS" ? setInssBrackets : setIrrfBrackets;

    setter((prev) => prev.filter((_, i) => i !== index));
  }

  function renderBracketEditor(
    taxType: PayrollTaxType,
    brackets: BracketForm[]
  ) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass}>
            Faixas de {taxType}
            {taxType === "INSS"
              ? " (a última faixa é o teto)"
              : " (deixe o topo da última faixa em 0 = sem teto)"}
          </label>

          <button
            type="button"
            onClick={() => addBracket(taxType)}
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            <Plus size={14} />
            Adicionar faixa
          </button>
        </div>

        <div className="space-y-2">
          {brackets.map((b, index) => (
            <div
              key={index}
              className="grid grid-cols-12 items-center gap-2 rounded-xl border border-[var(--border)] p-2"
            >
              <CurrencyInput
                wrapperClassName="col-span-3"
                className={fieldClass}
                value={b.minBase}
                onChange={(v) => updateBracket(taxType, index, { minBase: v })}
              />

              <CurrencyInput
                wrapperClassName="col-span-3"
                className={fieldClass}
                value={b.maxBase}
                onChange={(v) => updateBracket(taxType, index, { maxBase: v })}
              />

              <input
                inputMode="decimal"
                placeholder="Alíquota %"
                className={`${fieldClass} col-span-2`}
                value={b.rate}
                onChange={(e) =>
                  updateBracket(taxType, index, {
                    rate: Number(e.target.value.replace(",", ".")) || 0,
                  })
                }
              />

              <CurrencyInput
                wrapperClassName="col-span-3"
                className={fieldClass}
                value={b.deduction}
                onChange={(v) =>
                  updateBracket(taxType, index, { deduction: v })
                }
              />

              <button
                type="button"
                onClick={() => removeBracket(taxType, index)}
                title="Remover faixa"
                aria-label="Remover faixa"
                className="col-span-1 flex justify-center py-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)]"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Colunas: base de — base até — alíquota % — parcela a deduzir.
        </p>
      </div>
    );
  }

  return (
    <AppShell workspaceLabel="Parâmetros fiscais">
      <ListPageLayout
        header={
          <>
            <header>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Parâmetros fiscais da folha
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Tabelas de INSS, IRRF e FGTS por vigência. As tabelas
                    mudam todo ano — cadastre uma nova vigência em vez de
                    alterar a antiga, para que folhas já fechadas continuem
                    auditáveis com os valores da época.
                  </p>
                </div>

                <Can permission="payroll-tax-table.manage">
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Nova vigência
                  </button>
                </Can>
              </div>
            </header>

            {listError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {listError}
              </div>
            )}
          </>
        }
      >
        <div className="space-y-6 p-4">
          {settings && (
            <section className="rounded-2xl border border-[var(--border)] p-4">
              <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                Configurações da folha
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>
                    Adicional de hora extra (%)
                  </label>

                  <input
                    inputMode="decimal"
                    className={fieldClass}
                    value={settings.extraHourSurchargePercentage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        extraHourSurchargePercentage: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Vale Transporte (% do salário)
                  </label>

                  <input
                    inputMode="decimal"
                    className={fieldClass}
                    value={settings.transportVoucherPercentage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        transportVoucherPercentage: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Parcelas padrão do 13º</label>

                  <select
                    className={fieldClass}
                    value={settings.thirteenthDefaultInstallments}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        thirteenthDefaultInstallments: Number(e.target.value),
                      })
                    }
                  >
                    <option value={1}>1 parcela</option>
                    <option value={2}>2 parcelas</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Can permission="payroll-settings.manage">
                    <button
                      type="button"
                      disabled={settingsSaving}
                      onClick={() => void saveSettings()}
                      className="flex h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                    >
                      <Save size={18} />
                      {settingsSaving ? "Salvando..." : "Salvar"}
                    </button>
                  </Can>
                </div>
              </div>

              {settingsMessage && (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {settingsMessage}
                </p>
              )}
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Vigências cadastradas
            </h2>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
                  />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Nenhuma vigência cadastrada.
              </p>
            ) : (
              <div className="space-y-4">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className="rounded-2xl border border-[var(--border)] p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--text-primary)]">
                        Vigência a partir de {date(table.validFrom)}
                        {table.validTo
                          ? ` até ${date(table.validTo)}`
                          : " (atual)"}
                      </p>

                      <p className="text-sm text-[var(--text-secondary)]">
                        FGTS {num(table.fgtsPercentage)}% · dedução por
                        dependente {money(table.dependentDeductionValue)}
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {(["INSS", "IRRF"] as const).map((taxType) => (
                        <div key={taxType}>
                          <p className="mb-1 text-xs font-semibold uppercase text-[var(--text-muted)]">
                            {taxType}
                          </p>

                          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">
                                    De
                                  </th>
                                  <th className="px-3 py-2 font-semibold">
                                    Até
                                  </th>
                                  <th className="px-3 py-2 text-right font-semibold">
                                    Alíquota
                                  </th>
                                  <th className="px-3 py-2 text-right font-semibold">
                                    Deduzir
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {table.brackets
                                  .filter((b) => b.taxType === taxType)
                                  .sort((a, b) => a.order - b.order)
                                  .map((b, i) => (
                                    <tr
                                      key={i}
                                      className="border-t border-[var(--border)]"
                                    >
                                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                                        {money(b.minBase)}
                                      </td>
                                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                                        {b.maxBase
                                          ? money(b.maxBase)
                                          : "sem teto"}
                                      </td>
                                      <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                                        {num(b.rate)}%
                                      </td>
                                      <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                                        {money(b.deduction)}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </ListPageLayout>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFormOpen(false);
            }
          }}
        >
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Nova vigência de parâmetros fiscais
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

            <div className="space-y-4 p-6 pt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Vigente a partir de</label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.validFrom}
                    onChange={(e) =>
                      setForm({ ...form, validFrom: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>FGTS (%)</label>

                  <input
                    inputMode="decimal"
                    className={fieldClass}
                    value={form.fgtsPercentage}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fgtsPercentage:
                          Number(e.target.value.replace(",", ".")) || 0,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Dedução por dependente (R$)
                  </label>

                  <CurrencyInput
                    className={fieldClass}
                    value={form.dependentDeductionValue}
                    onChange={(v) =>
                      setForm({ ...form, dependentDeductionValue: v })
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
                  Redutor adicional de IRRF (isenção ampliada)
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={labelClass}>Isento até (R$)</label>

                    <CurrencyInput
                      className={fieldClass}
                      value={form.irrfReliefThreshold}
                      onChange={(v) =>
                        setForm({ ...form, irrfReliefThreshold: v })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Redutor acaba em (R$)
                    </label>

                    <CurrencyInput
                      className={fieldClass}
                      value={form.irrfReliefPhaseOutEnd}
                      onChange={(v) =>
                        setForm({ ...form, irrfReliefPhaseOutEnd: v })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Parte fixa</label>

                    <CurrencyInput
                      className={fieldClass}
                      value={form.irrfReliefBase}
                      onChange={(v) => setForm({ ...form, irrfReliefBase: v })}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Fator</label>

                    <input
                      inputMode="decimal"
                      className={fieldClass}
                      value={form.irrfReliefFactor}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          irrfReliefFactor:
                            Number(e.target.value.replace(",", ".")) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Fórmula do redutor: parte fixa − (fator × base tributável).
                  Deixe tudo em zero se a vigência não tiver redutor.
                </p>
              </div>

              {renderBracketEditor("INSS", inssBrackets)}
              {renderBracketEditor("IRRF", irrfBrackets)}

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
                  onClick={() => void saveTable()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar vigência"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
