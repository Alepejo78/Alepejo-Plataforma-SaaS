"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Eye,
  FileText,
  Plus,
  Trash2,
  Undo2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  QUOTATION_STATUS_LABELS,
  quotationService,
  type Quotation,
  type QuotationStatus,
} from "@/services/quotation.service";

import {
  partnerService,
  type BusinessPartner,
} from "@/services/partner.service";

import {
  warehouseService,
  type Warehouse,
} from "@/services/inventory.service";

import {
  productService,
  type Product,
} from "@/services/product.service";

import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/services/financial-entry.service";

import {
  chartOfAccountService,
  type ChartOfAccount,
} from "@/services/chart-of-account.service";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function qty(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function formatNumber(n: number) {
  return `COT-${String(n).padStart(6, "0")}`;
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

const STATUS_BADGE_CLASS: Record<QuotationStatus, string> = {
  DRAFT: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
  DECIDED: "bg-[var(--success-soft)] text-[var(--success)]",
  CANCELLED: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

const MAX_OFFERS = 3;

interface ItemForm {
  productId: string;
  productLabel: string;
  quantity: string;
}

function emptyItem(): ItemForm {
  return { productId: "", productLabel: "", quantity: "" };
}

export default function CotacoesPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [quotations, setQuotations] = useState<Quotation[]>(
    []
  );
  const [warehouses, setWarehouses] = useState<Warehouse[]>(
    []
  );

  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Nova cotação
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    warehouseId: "",
    quotationDate: todayIso(),
    observation: "",
  });
  const [items, setItems] = useState<ItemForm[]>([
    emptyItem(),
  ]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Gerenciar cotação (itens + propostas)
  const [detail, setDetail] = useState<Quotation | null>(
    null
  );
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Nova proposta de fornecedor
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({
    partnerId: "",
    partnerLabel: "",
    termDays: "",
    installmentsCount: "",
    paymentMethod: "" as PaymentMethod | "",
  });
  const [offerPrices, setOfferPrices] = useState<
    Record<string, number>
  >({});
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerError, setOfferError] = useState("");

  // Escolher vencedora — confirmação com opção de já gerar título
  // financeiro (pagamento antecipado)
  const [chooseWinnerOfferId, setChooseWinnerOfferId] = useState<
    string | null
  >(null);
  const [chooseWinnerForm, setChooseWinnerForm] = useState({
    generateFinancialEntry: false,
    dueDate: "",
    paymentMethod: "" as PaymentMethod | "",
    chartOfAccountId: "",
    chartOfAccountLabel: "",
  });
  const [chooseWinnerError, setChooseWinnerError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    warehouseService
      .list()
      .then(setWarehouses)
      .catch(() => {
        setListError(
          "Não foi possível carregar os depósitos."
        );
      });
  }, []);

  const searchSuppliers = useCallback(
    async (query: string) => {
      const result = await partnerService.list({
        role: "SUPPLIER",
        search: query || undefined,
        limit: 20,
      });

      return result.data;
    },
    []
  );

  const searchProducts = useCallback(
    async (query: string) => {
      const result = await productService.list({
        search: query || undefined,
        limit: 20,
      });

      return result.data;
    },
    []
  );

  const searchChartOfAccounts = useCallback(async (query: string) => {
    const result = await chartOfAccountService.list({
      search: query || undefined,
      limit: 20,
    });

    return result.data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await quotationService.list({
        status: (statusFilter || undefined) as
          | QuotationStatus
          | undefined,
      });

      setQuotations(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as cotações."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm({
      warehouseId: warehouses[0]?.id ?? "",
      quotationDate: todayIso(),
      observation: "",
    });
    setItems([emptyItem()]);
    setFormError("");
    setCreateOpen(true);
  }

  const decimal = (value: string) => {
    const normalized = value
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  function updateItem(
    index: number,
    patch: Partial<ItemForm>
  ) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, ...patch } : it
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveCreate() {
    if (!form.warehouseId) {
      setFormError("Selecione o depósito.");

      return;
    }

    const validItems = items.filter(
      (it) => it.productId && decimal(it.quantity) > 0
    );

    if (validItems.length === 0) {
      setFormError(
        "Adicione ao menos um item com produto e quantidade."
      );

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const created = await quotationService.create({
        warehouseId: form.warehouseId,
        quotationDate: form.quotationDate || undefined,
        observation: form.observation || undefined,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: decimal(it.quantity),
        })),
      });

      setCreateOpen(false);

      await load();

      openManage(created);
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível cadastrar a cotação."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function refreshDetail(id: string) {
    const fresh = await quotationService.getById(id);

    setDetail(fresh);

    setQuotations((prev) =>
      prev.map((q) => (q.id === fresh.id ? fresh : q))
    );
  }

  function openManage(quotation: Quotation) {
    setDetail(quotation);
    setDetailError("");
  }

  async function cancelQuotation(id: string) {
    setActionId(id);
    setActionError("");

    try {
      await quotationService.cancel(id);

      await load();

      if (detail?.id === id) {
        setDetail(null);
      }
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível cancelar a cotação."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function removeQuotation(id: string) {
    if (!window.confirm("Excluir esta cotação? Não pode ser desfeito.")) {
      return;
    }

    setActionId(id);
    setActionError("");

    try {
      await quotationService.remove(id);

      await load();

      if (detail?.id === id) {
        setDetail(null);
      }
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível excluir a cotação.")
      );
    } finally {
      setActionId("");
    }
  }

  function openOfferForm() {
    if (!detail) {
      return;
    }

    setOfferForm({
      partnerId: "",
      partnerLabel: "",
      termDays: "",
      installmentsCount: "",
      paymentMethod: "",
    });

    const prices: Record<string, number> = {};

    for (const item of detail.items) {
      prices[item.productId] = 0;
    }

    setOfferPrices(prices);
    setOfferError("");
    setOfferFormOpen(true);
  }

  async function saveOffer() {
    if (!detail) {
      return;
    }

    if (!offerForm.partnerId) {
      setOfferError("Selecione o fornecedor.");

      return;
    }

    const items = detail.items.map((item) => ({
      productId: item.productId,
      unitPrice: offerPrices[item.productId] ?? 0,
    }));

    if (items.some((it) => it.unitPrice <= 0)) {
      setOfferError(
        "Informe o preço de todos os itens da cotação."
      );

      return;
    }

    setOfferSaving(true);
    setOfferError("");

    try {
      await quotationService.addOffer(detail.id, {
        partnerId: offerForm.partnerId,
        termDays: offerForm.termDays
          ? Number(offerForm.termDays)
          : undefined,
        installmentsCount: offerForm.installmentsCount
          ? Number(offerForm.installmentsCount)
          : undefined,
        paymentMethod: offerForm.paymentMethod || undefined,
        items,
      });

      setOfferFormOpen(false);

      await refreshDetail(detail.id);
    } catch (err) {
      setOfferError(
        extractMessage(
          err,
          "Não foi possível adicionar a proposta."
        )
      );
    } finally {
      setOfferSaving(false);
    }
  }

  async function removeOffer(offerId: string) {
    if (!detail) {
      return;
    }

    setDetailBusy(true);
    setDetailError("");

    try {
      await quotationService.removeOffer(detail.id, offerId);

      await refreshDetail(detail.id);
    } catch (err) {
      setDetailError(
        extractMessage(
          err,
          "Não foi possível remover a proposta."
        )
      );
    } finally {
      setDetailBusy(false);
    }
  }

  function openChooseWinner(offerId: string) {
    setChooseWinnerOfferId(offerId);
    setChooseWinnerForm({
      generateFinancialEntry: false,
      dueDate: "",
      paymentMethod: "",
      chartOfAccountId: "",
      chartOfAccountLabel: "",
    });
    setChooseWinnerError("");
  }

  async function confirmChooseWinner() {
    if (!detail || !chooseWinnerOfferId) {
      return;
    }

    if (chooseWinnerForm.generateFinancialEntry) {
      if (!chooseWinnerForm.dueDate) {
        setChooseWinnerError(
          "Informe o vencimento do título antecipado."
        );

        return;
      }

      if (!chooseWinnerForm.chartOfAccountId) {
        setChooseWinnerError(
          "Informe o tipo de despesa do título antecipado."
        );

        return;
      }
    }

    setDetailBusy(true);
    setChooseWinnerError("");

    try {
      await quotationService.chooseWinner(
        detail.id,
        chooseWinnerOfferId,
        {
          generateFinancialEntry:
            chooseWinnerForm.generateFinancialEntry,
          dueDate: chooseWinnerForm.dueDate || undefined,
          paymentMethod: chooseWinnerForm.paymentMethod || undefined,
          chartOfAccountId:
            chooseWinnerForm.chartOfAccountId || undefined,
        }
      );

      setChooseWinnerOfferId(null);

      await refreshDetail(detail.id);

      await load();
    } catch (err) {
      setChooseWinnerError(
        extractMessage(
          err,
          "Não foi possível escolher o vencedor."
        )
      );
    } finally {
      setDetailBusy(false);
    }
  }

  async function undoWinner() {
    if (!detail) {
      return;
    }

    setDetailBusy(true);
    setDetailError("");

    try {
      await quotationService.undoWinner(detail.id);

      await refreshDetail(detail.id);

      await load();
    } catch (err) {
      setDetailError(
        extractMessage(
          err,
          "Não foi possível estornar a vencedora."
        )
      );
    } finally {
      setDetailBusy(false);
    }
  }

  const semDeposito = warehouses.length === 0;

  return (
    <AppShell workspaceLabel="Cotações">
      <ListPageLayout
        header={
          <>
            <header>
              <Link
                href="/erp/compras"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={16} />
                Voltar para Compras
              </Link>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Cotações
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Compare até {MAX_OFFERS} propostas de
                    fornecedores diferentes e escolha a
                    melhor.
                  </p>
                </div>

                <div className="flex gap-2">
                  <ExportButton
                    tableRef={exportTableRef}
                    filename="cotacoes"
                    sheetName="Cotações"
                  />

                  <Link
                    href="/erp/compras/cotacoes/relatorio"
                    target="_blank"
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <FileText size={18} />
                    Relatório
                  </Link>

                  <Can permission="quotation.create">
                    <button
                      type="button"
                      onClick={openCreate}
                      disabled={semDeposito}
                      title={
                        semDeposito
                          ? "Cadastre um depósito primeiro"
                          : undefined
                      }
                      className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
                    >
                      <Plus size={18} />
                      Nova cotação
                    </button>
                  </Can>
                </div>
              </div>
            </header>

            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className={`${fieldClass} max-w-64`}
              >
                <option value="">Todos os status</option>

                {Object.entries(QUOTATION_STATUS_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

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
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma cotação cadastrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Nova cotação&quot; para comparar
              fornecedores.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Número
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Data
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Depósito
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Itens
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Propostas
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {quotations.map((q) => {
                  const busy = actionId === q.id;

                  return (
                    <tr
                      key={q.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatNumber(q.number)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(q.quotationDate ?? q.createdAt)}
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {q.warehouse?.code ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {q.items?.length ?? 0}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {q.offers?.length ?? 0}/{MAX_OFFERS}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[q.status]}`}
                        >
                          {QUOTATION_STATUS_LABELS[q.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openManage(q)}
                            title="Ver / gerenciar propostas"
                            aria-label="Ver / gerenciar propostas"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Eye size={16} />
                          </button>

                          {q.status === "DRAFT" && (
                            <Can permission="quotation.cancel">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void cancelQuotation(q.id)
                                }
                                title="Cancelar"
                                aria-label="Cancelar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <XCircle size={16} />
                              </button>
                            </Can>
                          )}

                          {q.status === "CANCELLED" && (
                            <Can permission="quotation.delete">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void removeQuotation(q.id)
                                }
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

      {/* Nova cotação */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Nova cotação
              </h2>

              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>
                    Depósito
                  </label>

                  <select
                    className={fieldClass}
                    value={form.warehouseId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        warehouseId: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Data</label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={form.quotationDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quotationDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Observação
                  </label>

                  <input
                    className={fieldClass}
                    value={form.observation}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        observation: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className={labelClass}>
                    Itens a cotar
                  </label>

                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <Plus size={14} />
                    Adicionar item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 items-start gap-2 rounded-xl border border-[var(--border)] p-2"
                    >
                      <div className="col-span-9">
                        <SearchSelect<Product>
                          displayLabel={it.productLabel}
                          search={searchProducts}
                          getId={(p) => p.id}
                          getLabel={(p) =>
                            `${p.code} — ${p.description}`
                          }
                          placeholder="Digite para buscar o produto..."
                          onSelect={(p) =>
                            updateItem(index, {
                              productId: p?.id ?? "",
                              productLabel: p
                                ? `${p.code} — ${p.description}`
                                : "",
                            })
                          }
                        />
                      </div>

                      <input
                        inputMode="decimal"
                        placeholder="Qtd"
                        className={`${fieldClass} col-span-2`}
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(index, {
                            quantity: e.target.value,
                          })
                        }
                      />

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        title="Remover item"
                        aria-label="Remover item"
                        className="col-span-1 flex justify-center py-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)] disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveCreate()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving
                    ? "Salvando..."
                    : "Cadastrar e adicionar propostas"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gerenciar cotação: itens + propostas */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {formatNumber(detail.number)}
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  {date(
                    detail.quotationDate ?? detail.createdAt
                  )}{" "}
                  · {detail.warehouse?.code} ·{" "}
                  {QUOTATION_STATUS_LABELS[detail.status]}
                  {detail.createdByName &&
                    ` · Criado por ${detail.createdByName}`}
                  {detail.updatedByName &&
                    detail.updatedByName !==
                      detail.createdByName &&
                    ` · Última alteração por ${detail.updatedByName}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className={labelClass}>Itens cotados</p>

                <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-4 py-2 font-semibold">
                          Produto
                        </th>
                        <th className="px-4 py-2 text-right font-semibold">
                          Qtd
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {detail.items.map((it) => (
                        <tr
                          key={it.id}
                          className="border-t border-[var(--border)]"
                        >
                          <td className="px-4 py-2 text-[var(--text-primary)]">
                            {it.product?.description ?? "—"}
                          </td>

                          <td className="whitespace-nowrap px-4 py-2 text-right text-[var(--text-secondary)]">
                            {qty(it.quantity)}{" "}
                            {it.product?.unit?.code ?? ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className={labelClass}>
                    Propostas de fornecedores (
                    {detail.offers.length}/{MAX_OFFERS})
                  </p>

                  {detail.status === "DRAFT" &&
                    detail.offers.length < MAX_OFFERS && (
                      <Can permission="quotation.update">
                        <button
                          type="button"
                          onClick={openOfferForm}
                          className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                        >
                          <Plus size={14} />
                          Adicionar proposta
                        </button>
                      </Can>
                    )}

                  {detail.status === "DECIDED" && (
                    <Can permission="quotation.decide">
                      <button
                        type="button"
                        disabled={detailBusy}
                        onClick={() => void undoWinner()}
                        title="Estornar a vencedora (só se o pedido de compra gerado ainda não virou uma compra)"
                        className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50"
                      >
                        <Undo2 size={14} />
                        Estornar vencedora
                      </button>
                    </Can>
                  )}
                </div>

                {detailError && (
                  <div className="mb-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                    {detailError}
                  </div>
                )}

                {detail.offers.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Nenhuma proposta ainda.
                  </p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-3">
                    {detail.offers.map((offer) => (
                      <div
                        key={offer.id}
                        className={`rounded-2xl border p-4 ${
                          offer.isWinner
                            ? "border-[var(--success)] bg-[var(--success-soft)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">
                              {offer.partner?.tradeName ??
                                offer.partner?.legalName}
                            </p>

                            {offer.isWinner && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--success)]">
                                <Award size={12} />
                                Vencedora
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                          {offer.items.map((it) => (
                            <div
                              key={it.id}
                              className="flex justify-between gap-2"
                            >
                              <span>
                                {it.product?.description}
                              </span>
                              <span>{money(it.unitPrice)}</span>
                            </div>
                          ))}
                        </div>

                        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                          Total: {money(offer.totalAmount)}
                        </p>

                        {offer.termDays != null && (
                          <p className="text-xs text-[var(--text-muted)]">
                            Prazo: {offer.termDays} dia(s)
                            {offer.installmentsCount != null &&
                              offer.installmentsCount > 1 &&
                              ` em ${offer.installmentsCount}x`}
                          </p>
                        )}

                        {offer.paymentMethod && (
                          <p className="text-xs text-[var(--text-muted)]">
                            Pagamento:{" "}
                            {
                              PAYMENT_METHOD_LABELS[
                                offer.paymentMethod
                              ]
                            }
                          </p>
                        )}

                        {offer.purchaseOrder && (
                          <p className="mt-2 text-xs font-semibold text-[var(--success)]">
                            Pedido de compra gerado: PC-
                            {String(
                              offer.purchaseOrder.number
                            ).padStart(6, "0")}
                          </p>
                        )}

                        {offer.purchaseOrder?.financialEntries?.[0] && (
                          <p className="mt-1 text-xs font-semibold text-[var(--warning)]">
                            Título antecipado gerado: vence em{" "}
                            {date(
                              offer.purchaseOrder.financialEntries[0]
                                .dueDate
                            )}
                            , {money(
                              offer.purchaseOrder.financialEntries[0]
                                .amount
                            )}
                          </p>
                        )}

                        {detail.status === "DRAFT" && (
                          <div className="mt-3 flex gap-2">
                            <Can permission="quotation.decide">
                              <button
                                type="button"
                                disabled={detailBusy}
                                onClick={() =>
                                  openChooseWinner(offer.id)
                                }
                                className="flex-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-contrast)] disabled:opacity-50"
                              >
                                Escolher vencedora
                              </button>
                            </Can>

                            <Can permission="quotation.update">
                              <button
                                type="button"
                                disabled={detailBusy}
                                onClick={() =>
                                  void removeOffer(offer.id)
                                }
                                title="Remover proposta"
                                aria-label="Remover proposta"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </Can>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nova proposta de fornecedor */}
      {offerFormOpen && detail && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Nova proposta — {formatNumber(detail.number)}
              </h2>

              <button
                type="button"
                onClick={() => setOfferFormOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  Fornecedor
                </label>

                <SearchSelect<BusinessPartner>
                  displayLabel={offerForm.partnerLabel}
                  search={searchSuppliers}
                  getId={(p) => p.id}
                  getLabel={(p) =>
                    p.tradeName ?? p.legalName
                  }
                  getSubLabel={(p) => p.document}
                  placeholder="Digite para buscar o fornecedor..."
                  onSelect={(p) =>
                    setOfferForm({
                      ...offerForm,
                      partnerId: p?.id ?? "",
                      partnerLabel: p
                        ? (p.tradeName ?? p.legalName)
                        : "",
                    })
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>
                    Prazo (dias)
                  </label>

                  <input
                    type="number"
                    min={0}
                    className={fieldClass}
                    value={offerForm.termDays}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        termDays: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Número de parcelas
                  </label>

                  <input
                    type="number"
                    min={1}
                    placeholder="1"
                    title="Em quantos títulos o vencimento se divide — 30/60/90 com prazo 30 e 3 parcelas"
                    className={fieldClass}
                    value={offerForm.installmentsCount}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        installmentsCount: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Forma de pagamento
                  </label>

                  <select
                    className={fieldClass}
                    value={offerForm.paymentMethod}
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        paymentMethod: e.target
                          .value as PaymentMethod | "",
                      })
                    }
                  >
                    <option value="">Selecione...</option>

                    {Object.entries(
                      PAYMENT_METHOD_LABELS
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className={labelClass}>
                  Preço por item
                </p>

                <div className="space-y-2">
                  {detail.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-2"
                    >
                      <span className="flex-1 text-sm text-[var(--text-primary)]">
                        {item.product?.description} (
                        {qty(item.quantity)}{" "}
                        {item.product?.unit?.code})
                      </span>

                      <CurrencyInput
                        placeholder="Preço unit."
                        wrapperClassName="w-40 shrink-0"
                        className={fieldClass}
                        value={offerPrices[item.productId]}
                        onChange={(value) =>
                          setOfferPrices({
                            ...offerPrices,
                            [item.productId]: value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {offerError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {offerError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOfferFormOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={offerSaving}
                  onClick={() => void saveOffer()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {offerSaving
                    ? "Salvando..."
                    : "Adicionar proposta"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Escolher vencedora — confirmação + título antecipado opcional */}
      {chooseWinnerOfferId && detail && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Escolher vencedora
              </h2>

              <button
                type="button"
                onClick={() => setChooseWinnerOfferId(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={chooseWinnerForm.generateFinancialEntry}
                  onChange={(e) =>
                    setChooseWinnerForm({
                      ...chooseWinnerForm,
                      generateFinancialEntry: e.target.checked,
                    })
                  }
                />
                Gerar título financeiro agora (pagamento antecipado)
              </label>

              {chooseWinnerForm.generateFinancialEntry && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Tipo de despesa
                    </label>

                    <SearchSelect<ChartOfAccount>
                      displayLabel={
                        chooseWinnerForm.chartOfAccountLabel
                      }
                      search={searchChartOfAccounts}
                      getId={(c) => c.id}
                      getLabel={(c) =>
                        `${c.code} — ${c.description}`
                      }
                      placeholder="Digite para buscar a conta..."
                      onSelect={(c) =>
                        setChooseWinnerForm({
                          ...chooseWinnerForm,
                          chartOfAccountId: c?.id ?? "",
                          chartOfAccountLabel: c
                            ? `${c.code} — ${c.description}`
                            : "",
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Vencimento
                    </label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={chooseWinnerForm.dueDate}
                      onChange={(e) =>
                        setChooseWinnerForm({
                          ...chooseWinnerForm,
                          dueDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Forma de pagamento
                    </label>

                    <select
                      className={fieldClass}
                      value={chooseWinnerForm.paymentMethod}
                      onChange={(e) =>
                        setChooseWinnerForm({
                          ...chooseWinnerForm,
                          paymentMethod: e.target.value as
                            | PaymentMethod
                            | "",
                        })
                      }
                    >
                      <option value="">Selecione...</option>

                      {Object.entries(PAYMENT_METHOD_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              )}

              {chooseWinnerError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {chooseWinnerError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setChooseWinnerOfferId(null)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={detailBusy}
                  onClick={() => void confirmChooseWinner()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {detailBusy ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
