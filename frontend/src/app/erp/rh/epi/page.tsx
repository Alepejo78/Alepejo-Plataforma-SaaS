"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Mail,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { SearchSelect } from "@/components/ui/SearchSelect";

import {
  employeeService,
  ppeDeliveryService,
  ppeTypeService,
  PPE_DELIVERY_STATUS_LABELS,
  type AuxiliaryRecord,
  type Employee,
  type PpeDelivery,
} from "@/services/hr.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function qty(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
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

export default function FichaEpiPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [employee, setEmployee] = useState<Employee | null>(
    null
  );
  const [employeeLabel, setEmployeeLabel] = useState("");

  const [deliveries, setDeliveries] = useState<PpeDelivery[]>(
    []
  );
  const [ppeTypes, setPpeTypes] = useState<AuxiliaryRecord[]>(
    []
  );

  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [actionId, setActionId] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    ppeTypeId: "",
    ca: "",
    quantity: "1",
    deliveryDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (employeeId: string) => {
    setLoading(true);
    setListError("");

    try {
      const result = await ppeDeliveryService.list(
        employeeId
      );

      setDeliveries(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as entregas."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ppeTypeService
      .list()
      .then((r) => setPpeTypes(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (employee) {
      void load(employee.id);
    } else {
      setDeliveries([]);
    }
  }, [employee, load]);

  const searchEmployees = useCallback(
    async (query: string) => {
      return employeeService.list({
        search: query || undefined,
        limit: 20,
      });
    },
    []
  );

  function openForm() {
    setForm({
      ppeTypeId: "",
      ca: "",
      quantity: "1",
      deliveryDate: new Date().toISOString().slice(0, 10),
    });
    setFormError("");
    setFormOpen(true);
  }

  async function saveDelivery() {
    if (!employee) {
      return;
    }

    if (!form.ppeTypeId) {
      setFormError("Selecione o tipo de EPI.");

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await ppeDeliveryService.create({
        employeeId: employee.id,
        ppeTypeId: form.ppeTypeId,
        ca: form.ca.trim() || undefined,
        quantity: form.quantity
          ? Number(form.quantity.replace(",", "."))
          : undefined,
        deliveryDate: form.deliveryDate || undefined,
      });

      setFormOpen(false);

      await load(employee.id);
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível registrar a entrega."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeDelivery(delivery: PpeDelivery) {
    if (
      !window.confirm(
        `Remover a entrega de "${delivery.ppeType?.name}"?`
      )
    ) {
      return;
    }

    try {
      await ppeDeliveryService.remove(delivery.id);

      if (employee) {
        await load(employee.id);
      }
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível remover a entrega."
        )
      );
    }
  }

  async function confirmDelivery(delivery: PpeDelivery) {
    if (
      !window.confirm(
        `Confirmar que "${delivery.employee?.name}" recebeu o EPI "${delivery.ppeType?.name}"? Na ficha impressa, isso substitui a assinatura por "assinado digitalmente".`
      )
    ) {
      return;
    }

    setActionId(delivery.id);
    setListError("");

    try {
      await ppeDeliveryService.confirm(delivery.id);

      if (employee) {
        await load(employee.id);
      }
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível confirmar a entrega."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function sendConfirmation(delivery: PpeDelivery) {
    setActionId(delivery.id);
    setListError("");

    try {
      const result = await ppeDeliveryService.sendConfirmation(
        delivery.id
      );

      const channelLabel = result.channels
        .map((c) => (c === "email" ? "e-mail" : "WhatsApp"))
        .join(" e ");

      window.alert(
        result.sent
          ? `Link de confirmação enviado por ${channelLabel}.`
          : "Não foi possível enviar por nenhum canal — confira se o e-mail/WhatsApp da empresa está configurado."
      );

      if (employee) {
        await load(employee.id);
      }
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível enviar o link de confirmação."
        )
      );
    } finally {
      setActionId("");
    }
  }

  return (
    <AppShell workspaceLabel="Recursos Humanos">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Ficha de EPI
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Registro de entrega de equipamentos de
                  proteção individual, com geração da ficha
                  assinada (NR-6).
                </p>
              </div>

              <div className="flex gap-2">
                <ExportButton
                  tableRef={exportTableRef}
                  filename="ficha-de-epi"
                  sheetName="Ficha de EPI"
                />

                <Link
                  href="/erp/rh/cadastros"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  Tipos de EPI
                </Link>
              </div>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SearchSelect<Employee>
                displayLabel={employeeLabel}
                search={searchEmployees}
                getId={(e) => e.id}
                getLabel={(e) => e.name}
                getSubLabel={(e) => e.jobFunction?.name}
                placeholder="Digite para buscar o colaborador..."
                onSelect={(e) => {
                  setEmployee(e);
                  setEmployeeLabel(e?.name ?? "");
                }}
              />
            </div>

            {listError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {listError}
              </div>
            )}
          </>
        }
      >
        {!employee ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Selecione um colaborador
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Busque pelo nome acima para ver ou registrar
              entregas de EPI.
            </p>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {employee.name}
                </p>

                <p className="text-sm text-[var(--text-muted)]">
                  {employee.jobFunction?.name ?? "Sem função"}
                  {employee.jobFunction?.sector?.name &&
                    ` · ${employee.jobFunction.sector.name}`}
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/erp/rh/epi/ficha/${employee.id}`}
                  target="_blank"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <Printer size={18} />
                  Imprimir ficha
                </Link>

                <Can permission="ppe-delivery.create">
                  <button
                    type="button"
                    onClick={openForm}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Nova entrega
                  </button>
                </Can>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-xl bg-[var(--surface-hover)]"
                  />
                ))}
              </div>
            ) : deliveries.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--text-muted)]">
                Nenhuma entrega de EPI registrada para este
                colaborador.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table ref={exportTableRef} className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">
                        Data
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        EPI
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        CA
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Qtde
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>

                  <tbody>
                    {deliveries.map((d) => (
                      <tr
                        key={d.id}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          {date(d.deliveryDate)}
                        </td>

                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                          {d.ppeType?.name ?? "—"}
                        </td>

                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {d.ca || "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                          {qty(d.quantity)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              d.status === "CONFIRMADO"
                                ? "bg-[var(--success-soft)] text-[var(--success)]"
                                : "bg-[var(--warning-soft)] text-[var(--warning)]"
                            }`}
                          >
                            {PPE_DELIVERY_STATUS_LABELS[d.status]}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {d.status === "PENDENTE" && (
                              <Can permission="ppe-delivery.confirm">
                                <button
                                  type="button"
                                  disabled={actionId === d.id}
                                  onClick={() =>
                                    void sendConfirmation(d)
                                  }
                                  title="Enviar link de confirmação por e-mail/WhatsApp"
                                  aria-label="Enviar confirmação"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-40"
                                >
                                  <Mail size={16} />
                                </button>

                                <button
                                  type="button"
                                  disabled={actionId === d.id}
                                  onClick={() =>
                                    void confirmDelivery(d)
                                  }
                                  title="Confirmar entrega manualmente"
                                  aria-label="Confirmar entrega"
                                  className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-40"
                                >
                                  <Check size={16} />
                                </button>
                              </Can>
                            )}

                            <Can permission="ppe-delivery.delete">
                              <button
                                type="button"
                                onClick={() =>
                                  void removeDelivery(d)
                                }
                                title="Remover"
                                aria-label="Remover"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                              >
                                <Trash2 size={16} />
                              </button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </ListPageLayout>

      {formOpen && employee && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Nova entrega de EPI
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Tipo de EPI
                  </label>

                  <select
                    className={fieldClass}
                    value={form.ppeTypeId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ppeTypeId: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {ppeTypes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    CA (Certificado de Aprovação)
                  </label>

                  <input
                    className={fieldClass}
                    value={form.ca}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ca: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Quantidade
                  </label>

                  <input
                    inputMode="decimal"
                    className={fieldClass}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantity: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Data da entrega
                  </label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.deliveryDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deliveryDate: e.target.value,
                      })
                    }
                  />
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
                  onClick={() => void saveDelivery()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Registrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
