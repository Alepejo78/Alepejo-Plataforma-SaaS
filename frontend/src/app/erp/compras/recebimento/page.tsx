"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  PackageCheck,
  ScanBarcode,
  Undo2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import {
  PURCHASE_STATUS_LABELS,
  formatPurchaseNumber,
  purchaseService,
  type Purchase,
} from "@/services/purchase.service";

import {
  productService,
} from "@/services/product.service";

import {
  DOCUMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type FinancialDocumentType,
  type PaymentMethod,
} from "@/services/financial-entry.service";

import { calculateDueDatePreview } from "@/lib/dueDate";

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

type ViewFilter = "APPROVED" | "RECEIVED";

export default function RecebimentoPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [viewFilter, setViewFilter] =
    useState<ViewFilter>("APPROVED");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  // Recebimento
  const [receiveTarget, setReceiveTarget] =
    useState<Purchase | null>(null);
  const [receiveForm, setReceiveForm] = useState({
    invoiceNumber: "",
    invoiceKey: "",
    invoiceIssueDate: "",
    documentType: "" as FinancialDocumentType | "",
    termDays: "",
    installmentsCount: "",
    paymentMethod: "" as PaymentMethod | "",
  });
  const [receiveError, setReceiveError] = useState("");

  // Conferência por código de barras
  const [conferred, setConferred] = useState<
    Record<string, number>
  >({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeMultiplier, setBarcodeMultiplier] =
    useState("1");
  const [barcodeError, setBarcodeError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await purchaseService.list({
        status: viewFilter,
        search: search || undefined,
      });

      setPurchases(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar as compras."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [viewFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      300
    );

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const id = new URLSearchParams(
      window.location.search
    ).get("open");

    if (!id) {
      return;
    }

    window.history.replaceState(
      null,
      "",
      "/erp/compras/recebimento"
    );

    purchaseService
      .getById(id)
      .then((purchase) => openReceive(purchase))
      .catch(() => {
        setListError(
          "Não foi possível abrir a compra para recebimento."
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openReceive(purchase: Purchase) {
    setReceiveTarget(purchase);
    setReceiveForm({
      invoiceNumber: "",
      invoiceKey: "",
      invoiceIssueDate: "",
      documentType: "",
      termDays:
        purchase.termDays != null
          ? String(purchase.termDays)
          : "",
      installmentsCount:
        purchase.installmentsCount != null &&
        purchase.installmentsCount > 1
          ? String(purchase.installmentsCount)
          : "",
      paymentMethod: purchase.paymentMethod ?? "",
    });
    setReceiveError("");
    setConferred({});
    setBarcodeInput("");
    setBarcodeMultiplier("1");
    setBarcodeError("");
  }

  async function handleBarcodeSubmit() {
    const code = barcodeInput.trim();

    if (!code || !receiveTarget) {
      return;
    }

    setBarcodeError("");

    try {
      const result = await productService.list({
        barcode: code,
        limit: 1,
      });

      const product = result.data?.[0];

      if (!product) {
        setBarcodeError(
          `Nenhum produto encontrado para o código de barras "${code}".`
        );

        return;
      }

      const item = receiveTarget.items.find(
        (it) => it.productId === product.id
      );

      if (!item) {
        setBarcodeError(
          `"${product.description}" não faz parte desta compra.`
        );

        return;
      }

      const multiplier = Math.max(
        1,
        Math.trunc(Number(barcodeMultiplier) || 1)
      );

      setConferred((prev) => {
        const current = prev[item.id] ?? 0;
        const ordered = num(item.quantity);

        if (current >= ordered) {
          setBarcodeError(
            `Quantidade de "${product.description}" já conferida por completo (${qty(ordered)}).`
          );

          return prev;
        }

        return {
          ...prev,
          [item.id]: Math.min(current + multiplier, ordered),
        };
      });

      setBarcodeInput("");
    } catch (err) {
      setBarcodeError(
        extractMessage(
          err,
          "Não foi possível buscar o produto pelo código de barras."
        )
      );
    }
  }

  async function confirmReceive() {
    if (!receiveTarget) {
      return;
    }

    setActionId(receiveTarget.id);
    setReceiveError("");

    try {
      await purchaseService.receive(receiveTarget.id, {
        invoiceNumber: receiveForm.invoiceNumber || undefined,
        invoiceKey: receiveForm.invoiceKey || undefined,
        invoiceIssueDate:
          receiveForm.invoiceIssueDate || undefined,
        documentType: receiveForm.documentType || undefined,
        termDays: receiveForm.termDays
          ? Number(receiveForm.termDays)
          : undefined,
        installmentsCount: receiveForm.installmentsCount
          ? Number(receiveForm.installmentsCount)
          : undefined,
        paymentMethod: receiveForm.paymentMethod || undefined,
      });

      setReceiveTarget(null);

      await load();
    } catch (err) {
      setReceiveError(
        extractMessage(
          err,
          "Não foi possível confirmar o recebimento."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function runUnreceive(id: string) {
    setActionId(id);
    setActionError("");

    try {
      await purchaseService.unreceive(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível estornar o recebimento."
        )
      );
    } finally {
      setActionId("");
    }
  }

  async function runCancel(id: string) {
    setActionId(id);
    setActionError("");

    try {
      await purchaseService.cancel(id);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível cancelar a compra.")
      );
    } finally {
      setActionId("");
    }
  }

  return (
    <AppShell workspaceLabel="Compras">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Recebimento de compras
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Confirme o recebimento de mercadoria com os dados
                  da nota fiscal, conferindo os itens por código de
                  barras.
                </p>
              </div>

              <Link
                href="/erp/compras/recebimento/relatorio"
                target="_blank"
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              >
                <FileText size={18} />
                Relatório
              </Link>
            </header>

            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Buscar por número da compra ou fornecedor..."
                className={`${fieldClass} max-w-80`}
                value={searchInput}
                onChange={(e) =>
                  setSearchInput(e.target.value)
                }
              />

              <select
                value={viewFilter}
                onChange={(e) =>
                  setViewFilter(e.target.value as ViewFilter)
                }
                className={`${fieldClass} max-w-64`}
              >
                <option value="APPROVED">
                  Pendentes de recebimento
                </option>
                <option value="RECEIVED">Recebidas</option>
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
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              {viewFilter === "APPROVED"
                ? "Nenhuma compra pendente de recebimento"
                : "Nenhuma compra recebida"}
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {viewFilter === "APPROVED"
                ? "Compras aprovadas aparecem aqui até serem recebidas."
                : "Compras já recebidas aparecem aqui."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Número
                  </th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">
                    Fornecedor
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Depósito
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Itens
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Total
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {purchases.map((p) => {
                  const busy = actionId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--text-primary)]">
                        {formatPurchaseNumber(p.number)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                        {date(p.purchaseDate ?? p.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {p.partner?.tradeName ??
                            p.partner?.legalName ??
                            "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {p.warehouse?.code ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {p.items?.length ?? 0}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                        {money(p.totalAmount)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
                          {PURCHASE_STATUS_LABELS[p.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {p.status === "APPROVED" && (
                            <Can permission="purchase.receive">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => openReceive(p)}
                                title="Receber"
                                aria-label="Receber"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-50"
                              >
                                <PackageCheck size={16} />
                              </button>
                            </Can>
                          )}

                          {p.status === "APPROVED" && (
                            <Can permission="purchase.cancel">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void runCancel(p.id)
                                }
                                title="Cancelar"
                                aria-label="Cancelar"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <XCircle size={16} />
                              </button>
                            </Can>
                          )}

                          {p.status === "RECEIVED" && (
                            <Can permission="purchase.receive">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      "Tem certeza que deseja estornar?"
                                    )
                                  ) {
                                    return;
                                  }

                                  void runUnreceive(p.id);
                                }}
                                title="Estornar recebimento (só se ainda não houver pagamento no financeiro)"
                                aria-label="Estornar recebimento"
                                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
                              >
                                <Undo2 size={16} />
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

      {/* Confirmar recebimento */}
      {receiveTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Receber compra{" "}
                  {formatPurchaseNumber(receiveTarget.number)}
                </h2>

                <p className="text-sm text-[var(--text-muted)]">
                  {receiveTarget.partner?.tradeName ??
                    receiveTarget.partner?.legalName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReceiveTarget(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Conferência de itens por código de barras */}
              <div className="space-y-3">
                <label className={labelClass}>
                  Conferir itens (código de barras)
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanBarcode
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />

                    <input
                      placeholder="Escaneie ou digite o código e pressione Enter..."
                      className={`${fieldClass} pl-9`}
                      value={barcodeInput}
                      onChange={(e) => {
                        setBarcodeInput(e.target.value);
                        setBarcodeError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleBarcodeSubmit();
                        }
                      }}
                    />
                  </div>

                  <input
                    type="number"
                    min={1}
                    title="Multiplicador — quantidade somada a cada leitura (útil para caixas fechadas)"
                    placeholder="Qtd."
                    className={`${fieldClass} shrink-0 text-center`}
                    style={{ width: "5rem" }}
                    value={barcodeMultiplier}
                    onChange={(e) =>
                      setBarcodeMultiplier(e.target.value)
                    }
                  />
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  Multiplicador: cada leitura soma essa
                  quantidade (use para caixas fechadas, ex.:
                  12 un. por caixa).
                </p>

                {barcodeError && (
                  <p className="text-xs text-[var(--danger)]">
                    {barcodeError}
                  </p>
                )}

                <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">
                          Produto
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Pedido
                        </th>
                        <th className="px-3 py-2 text-right font-semibold">
                          Conferido
                        </th>
                        <th className="px-3 py-2 text-center font-semibold" />
                      </tr>
                    </thead>

                    <tbody>
                      {receiveTarget.items.map((it) => {
                        const ordered = num(it.quantity);
                        const done = conferred[it.id] ?? 0;
                        const complete = done >= ordered;

                        return (
                          <tr
                            key={it.id}
                            className="border-t border-[var(--border)]"
                          >
                            <td className="px-3 py-2">
                              <p className="font-medium text-[var(--text-primary)]">
                                {it.product?.description ?? "—"}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {it.product?.code}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-3 py-2 text-right text-[var(--text-secondary)]">
                              {qty(ordered)}{" "}
                              {it.product?.unit?.code ?? ""}
                            </td>

                            <td
                              className={`whitespace-nowrap px-3 py-2 text-right font-medium ${complete ? "text-[var(--success)]" : "text-[var(--text-primary)]"}`}
                            >
                              {qty(done)}
                            </td>

                            <td className="px-3 py-2 text-center">
                              {complete ? (
                                <span title="Item conferido">
                                  <CheckCircle2
                                    size={16}
                                    className="inline text-[var(--success)]"
                                  />
                                </span>
                              ) : (
                                <span
                                  title={
                                    done > 0
                                      ? "Conferência em andamento"
                                      : "Aguardando conferência"
                                  }
                                  className="mx-auto inline-block h-3 w-3 rounded-full transition-colors"
                                  style={{
                                    backgroundColor:
                                      done > 0
                                        ? "var(--warning)"
                                        : "var(--border)",
                                  }}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  A conferência é só um apoio visual — não altera as
                  quantidades já lançadas na compra.
                </p>
              </div>

              <div className="border-t border-[var(--border)]" />

              {/* Dados da nota fiscal */}
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-muted)]">
                  Dados da nota fiscal do fornecedor (opcional) —
                  ficam registrados na compra e no título gerado em
                  Contas a pagar.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={labelClass}>
                      Nº da nota fiscal
                    </label>

                    <input
                      className={fieldClass}
                      value={receiveForm.invoiceNumber}
                      onChange={(e) =>
                        setReceiveForm({
                          ...receiveForm,
                          invoiceNumber: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Chave de acesso (NF-e)
                    </label>

                    <input
                      maxLength={44}
                      inputMode="numeric"
                      placeholder="44 dígitos"
                      className={fieldClass}
                      value={receiveForm.invoiceKey}
                      onChange={(e) =>
                        setReceiveForm({
                          ...receiveForm,
                          invoiceKey: e.target.value,
                          documentType:
                            e.target.value &&
                            !receiveForm.documentType
                              ? "NOTA_FISCAL"
                              : receiveForm.documentType,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Data de emissão
                    </label>

                    <input
                      type="date"
                      className={fieldClass}
                      value={receiveForm.invoiceIssueDate}
                      onChange={(e) =>
                        setReceiveForm({
                          ...receiveForm,
                          invoiceIssueDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Tipo de documento
                    </label>

                    <select
                      className={fieldClass}
                      value={receiveForm.documentType}
                      onChange={(e) =>
                        setReceiveForm({
                          ...receiveForm,
                          documentType: e.target
                            .value as FinancialDocumentType | "",
                        })
                      }
                    >
                      <option value="">Selecione...</option>

                      {Object.entries(DOCUMENT_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  Dados financeiros do título gerado em Contas a
                  pagar — já vêm do lançamento da compra, mas pode
                  corrigir aqui com o que estiver na nota.
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>
                      Dias a vencer
                    </label>

                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      className={fieldClass}
                      value={receiveForm.termDays}
                      onChange={(e) =>
                        setReceiveForm({
                          ...receiveForm,
                          termDays: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Vencimento (calculado)
                    </label>

                    <div
                      className={`${fieldClass} flex items-center text-[var(--text-secondary)]`}
                    >
                      {date(
                        calculateDueDatePreview(
                          receiveForm.invoiceIssueDate ||
                            receiveTarget.purchaseDate?.slice(
                              0,
                              10
                            ) ||
                            undefined,
                          Number(receiveForm.termDays) || 0
                        ).toISOString()
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Forma de pagamento
                    </label>

                    <select
                      className={fieldClass}
                      value={receiveForm.paymentMethod}
                      onChange={(e) =>
                        setReceiveForm({
                          ...receiveForm,
                          paymentMethod: e.target
                            .value as PaymentMethod | "",
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
                      value={receiveForm.installmentsCount}
                      onChange={(e) =>
                        setReceiveForm({
                          ...receiveForm,
                          installmentsCount: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {receiveError && (
                  <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                    {receiveError}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReceiveTarget(null)}
                    className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={actionId === receiveTarget.id}
                    onClick={() => void confirmReceive()}
                    className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                  >
                    {actionId === receiveTarget.id
                      ? "Confirmando..."
                      : "Confirmar recebimento"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
