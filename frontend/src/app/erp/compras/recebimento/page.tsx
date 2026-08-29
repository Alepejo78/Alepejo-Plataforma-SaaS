"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  PackageCheck,
  Plus,
  ScanBarcode,
  Trash2,
  Undo2,
  X,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

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

interface InstallmentRow {
  /** Dias a partir da data de emissão — opcional, só ajuda a calcular o vencimento. */
  days: string;
  dueDate: string;
  amount: number;
}

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

/** Divide o total entre as parcelas — a última absorve o arredondamento, igual ao backend. */
function buildInstallmentAmounts(
  totalAmount: number,
  count: number
): number[] {
  const base = Math.floor((totalAmount / count) * 100) / 100;
  const amounts: number[] = [];
  let allocated = 0;

  for (let i = 1; i <= count; i++) {
    const isLast = i === count;
    const amount = isLast
      ? Math.round((totalAmount - allocated) * 100) / 100
      : base;

    allocated += amount;
    amounts.push(amount);
  }

  return amounts;
}

/** Gera N parcelas já calculadas (30/60/90... dias, valor dividido) — ponto de partida editável, mesma conta que o backend faria sozinho. */
function buildInstallmentRows(
  issueDateIso: string | undefined,
  termDays: number,
  count: number,
  totalAmount: number
): InstallmentRow[] {
  const amounts = buildInstallmentAmounts(totalAmount, count);

  return Array.from({ length: count }, (_, i) => {
    const days = termDays * (i + 1);

    return {
      days: String(days),
      dueDate: toDateInput(
        calculateDueDatePreview(issueDateIso, days).toISOString()
      ),
      amount: amounts[i],
    };
  });
}

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
  // Parcelas do título gerado — editável linha a linha (dias,
  // vencimento e valor), igual à tela de Importar nota fiscal.
  const [installments, setInstallments] = useState<InstallmentRow[]>([
    { days: "", dueDate: "", amount: 0 },
  ]);

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

    // A nota já pode ter sido informada no lançamento da compra (na
    // mão ou por importação de XML) — herda esses dados em vez de
    // pedir de novo do zero, só continua editável se precisar corrigir.
    const issueDate =
      purchase.invoiceIssueDate ?? purchase.purchaseDate ?? null;
    const issueDateStr = issueDate ? issueDate.slice(0, 10) : "";
    const termDays = purchase.termDays ?? 0;
    const installmentsCount =
      purchase.installmentsCount != null &&
      purchase.installmentsCount > 1
        ? purchase.installmentsCount
        : 1;

    setReceiveForm({
      invoiceNumber: purchase.invoiceNumber ?? "",
      invoiceKey: purchase.invoiceKey ?? "",
      invoiceIssueDate: issueDateStr,
      documentType: purchase.invoiceKey ? "NOTA_FISCAL" : "",
      termDays: purchase.termDays != null ? String(purchase.termDays) : "",
      installmentsCount:
        installmentsCount > 1 ? String(installmentsCount) : "",
      paymentMethod: purchase.paymentMethod ?? "",
    });
    setInstallments(
      buildInstallmentRows(
        issueDateStr,
        termDays,
        installmentsCount,
        num(purchase.totalAmount)
      )
    );
    setReceiveError("");
    setConferred({});
    setBarcodeInput("");
    setBarcodeMultiplier("1");
    setBarcodeError("");
  }

  function updateInstallment(index: number, patch: Partial<InstallmentRow>) {
    setInstallments((prev) =>
      prev.map((row, i) => {
        if (i !== index) {
          return row;
        }

        const next = { ...row, ...patch };

        // Dias preenchido recalcula o vencimento a partir da data de
        // emissão — deixar em branco não mexe: a pessoa digita a
        // data direto.
        if (patch.days !== undefined && patch.days !== "") {
          next.dueDate = toDateInput(
            calculateDueDatePreview(
              receiveForm.invoiceIssueDate || undefined,
              Number(patch.days) || 0
            ).toISOString()
          );
        }

        return next;
      })
    );
  }

  function addInstallment() {
    setInstallments((prev) => [...prev, { days: "", dueDate: "", amount: 0 }]);
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
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

      const current = conferred[item.id] ?? 0;
      const ordered = num(item.quantity);
      const remaining = ordered - current;

      if (remaining <= 0) {
        setBarcodeError(
          `Quantidade de "${product.description}" já conferida por completo (${qty(ordered)}).`
        );

        return;
      }

      if (multiplier > remaining) {
        setBarcodeError(
          `Faltam apenas ${qty(remaining)} para conferir "${product.description}". Ajuste a quantidade.`
        );

        return;
      }

      setConferred((prev) => ({
        ...prev,
        [item.id]: current + multiplier,
      }));

      setBarcodeInput("");
      setBarcodeMultiplier("1");
    } catch (err) {
      setBarcodeError(
        extractMessage(
          err,
          "Não foi possível buscar o produto pelo código de barras."
        )
      );
    }
  }

  function isFullyConferred(purchase: Purchase) {
    return purchase.items.every(
      (it) => (conferred[it.id] ?? 0) >= num(it.quantity)
    );
  }

  async function confirmReceive() {
    if (!receiveTarget) {
      return;
    }

    if (!isFullyConferred(receiveTarget)) {
      setReceiveError(
        "Confira todos os itens (código de barras) antes de confirmar o recebimento."
      );

      return;
    }

    const totalAmount = num(receiveTarget.totalAmount);
    const singleInstallment = installments.length === 1;

    const finalInstallments = singleInstallment
      ? [{ dueDate: installments[0].dueDate, amount: totalAmount }]
      : installments.map((row) => ({
          dueDate: row.dueDate,
          amount: row.amount,
        }));

    if (finalInstallments.some((row) => !row.dueDate)) {
      setReceiveError("Preencha o vencimento de todas as parcelas.");

      return;
    }

    if (!singleInstallment) {
      const sum = finalInstallments.reduce(
        (acc, row) => acc + row.amount,
        0
      );

      if (Math.abs(sum - totalAmount) > 0.01) {
        setReceiveError(
          `A soma das parcelas (${money(sum)}) precisa bater com o total da compra (${money(totalAmount)}).`
        );

        return;
      }
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
        installments: finalInstallments,
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
                  Não altera as quantidades já lançadas na compra —
                  só precisa bater com o que foi pedido pra liberar a
                  confirmação do recebimento.
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
                      title="Gera essa quantidade de parcelas abaixo, já calculadas — dá pra editar antes de confirmar"
                      className={fieldClass}
                      value={receiveForm.installmentsCount}
                      onChange={(e) => {
                        const value = e.target.value;

                        setReceiveForm({
                          ...receiveForm,
                          installmentsCount: value,
                        });

                        const count = Number(value) || 1;

                        setInstallments(
                          buildInstallmentRows(
                            receiveForm.invoiceIssueDate ||
                              receiveTarget?.purchaseDate?.slice(0, 10) ||
                              undefined,
                            Number(receiveForm.termDays) || 0,
                            count,
                            num(receiveTarget?.totalAmount)
                          )
                        );
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className={labelClass}>Parcelas</label>

                    <button
                      type="button"
                      onClick={addInstallment}
                      className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                    >
                      <Plus size={14} />
                      Adicionar parcela
                    </button>
                  </div>

                  <div className="space-y-2">
                    {installments.map((row, index) => {
                      const singleInstallment = installments.length === 1;

                      return (
                        <div
                          key={index}
                          className="grid grid-cols-12 items-center gap-2 rounded-xl border border-[var(--border)] p-2"
                        >
                          <input
                            type="number"
                            min={0}
                            placeholder="Dias"
                            title="Dias a partir da emissão — calcula o vencimento"
                            className={`${fieldClass} col-span-2`}
                            value={row.days}
                            onChange={(e) =>
                              updateInstallment(index, {
                                days: e.target.value,
                              })
                            }
                          />

                          <input
                            type="date"
                            className={`${fieldClass} col-span-4`}
                            value={row.dueDate}
                            onChange={(e) =>
                              updateInstallment(index, {
                                dueDate: e.target.value,
                              })
                            }
                          />

                          <CurrencyInput
                            placeholder="Valor"
                            wrapperClassName="col-span-5"
                            className={fieldClass}
                            disabled={singleInstallment}
                            value={
                              singleInstallment
                                ? num(receiveTarget.totalAmount)
                                : row.amount
                            }
                            onChange={(value) =>
                              updateInstallment(index, { amount: value })
                            }
                          />

                          <button
                            type="button"
                            onClick={() => removeInstallment(index)}
                            disabled={installments.length === 1}
                            title="Remover parcela"
                            aria-label="Remover parcela"
                            className="col-span-1 flex justify-center py-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)] disabled:opacity-30"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex justify-end text-sm font-semibold text-[var(--text-primary)]">
                    Total:{" "}
                    {money(
                      installments.length === 1
                        ? num(receiveTarget.totalAmount)
                        : installments.reduce(
                            (sum, row) => sum + (row.amount || 0),
                            0
                          )
                    )}
                  </div>

                  {installments.length > 1 &&
                    (() => {
                      const sum = installments.reduce(
                        (acc, row) => acc + (row.amount || 0),
                        0
                      );
                      const total = num(receiveTarget.totalAmount);

                      return (
                        <p
                          className={`mt-1 text-right text-xs ${
                            Math.abs(sum - total) > 0.01
                              ? "text-[var(--danger)]"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          Precisa bater com o total da compra (
                          {money(total)}).
                        </p>
                      );
                    })()}
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
                    disabled={
                      actionId === receiveTarget.id ||
                      !isFullyConferred(receiveTarget)
                    }
                    title={
                      !isFullyConferred(receiveTarget)
                        ? "Confira todos os itens (código de barras) antes de confirmar"
                        : undefined
                    }
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
