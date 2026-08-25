"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";

import { SearchSelect } from "@/components/ui/SearchSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import {
  chartOfAccountService,
  type ChartOfAccount,
} from "@/services/chart-of-account.service";
import {
  partnerService,
  type BusinessPartner,
  type PartnerRole,
} from "@/services/partner.service";
import { productService, type Product } from "@/services/product.service";
import { type Warehouse } from "@/services/inventory.service";
import {
  DOCUMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type FinancialDocumentType,
  type PaymentMethod,
} from "@/services/financial-entry.service";
import {
  invoiceImportService,
  type ParsedInvoice,
} from "@/services/invoice-import.service";
import { calculateDueDatePreview } from "@/lib/dueDate";

type Direction = "PURCHASE" | "SALE";
type Mode = "ORDER" | "EXPENSE";

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  // Aceita tanto "2026-08-01" quanto "2026-08-01T10:00:00-03:00".
  return value.slice(0, 10);
}

interface ItemRow {
  productId: string;
  productLabel: string;
  hint: string;
  quantity: string;
  unitPrice: number;
  /** Serviço/despesa (não movimenta estoque) — o depósito não importa pra ele. */
  tracksStock: boolean;
}

interface InstallmentRow {
  /** Dias a partir da data de emissão — opcional, só ajuda a calcular o vencimento. */
  days: string;
  dueDate: string;
  amount: number;
}

interface PartnerState {
  partnerId: string;
  partnerLabel: string;
  document: string;
  legalName: string;
  tradeName: string;
  email: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

const emptyPartner: PartnerState = {
  partnerId: "",
  partnerLabel: "",
  document: "",
  legalName: "",
  tradeName: "",
  email: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

interface Props {
  direction: Direction;
  warehouses: Warehouse[];
  onClose: () => void;
  onSaved: () => void;
}

export function InvoiceImportModal({
  direction,
  warehouses,
  onClose,
  onSaved,
}: Props) {
  const isPurchase = direction === "PURCHASE";
  const partnerRole: PartnerRole = isPurchase
    ? "SUPPLIER"
    : "CUSTOMER";
  const partnerNoun = isPurchase ? "Fornecedor" : "Cliente";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseError, setParseError] = useState("");

  const [mode, setMode] = useState<Mode>("ORDER");
  const [partner, setPartner] = useState<PartnerState>(emptyPartner);
  const [warehouseId, setWarehouseId] = useState("");
  const [chartOfAccountId, setChartOfAccountId] = useState("");
  const [chartOfAccountLabel, setChartOfAccountLabel] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceKey, setInvoiceKey] = useState("");
  const [invoiceIssueDate, setInvoiceIssueDate] = useState("");
  const [documentType, setDocumentType] =
    useState<FinancialDocumentType | "">("");
  const [observation, setObservation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    PaymentMethod | ""
  >("");
  const [confirmReceipt, setConfirmReceipt] = useState(false);

  const [items, setItems] = useState<ItemRow[]>([
    {
      productId: "",
      productLabel: "",
      hint: "",
      quantity: "1",
      unitPrice: 0,
      tracksStock: true,
    },
  ]);

  const [expenseItemLabel, setExpenseItemLabel] = useState("");

  const [installments, setInstallments] = useState<InstallmentRow[]>([
    { days: "", dueDate: "", amount: 0 },
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const searchPartners = useCallback(
    async (query: string) => {
      const result = await partnerService.list({
        role: partnerRole,
        search: query || undefined,
        limit: 20,
      });

      return result.data;
    },
    [partnerRole]
  );

  const searchChartOfAccounts = useCallback(async (query: string) => {
    const result = await chartOfAccountService.list({
      search: query || undefined,
      limit: 20,
    });

    return result.data;
  }, []);

  const searchProducts = useCallback(async (query: string) => {
    const result = await productService.list({
      search: query || undefined,
      limit: 20,
    });

    return result.data;
  }, []);

  function applyPartner(p: BusinessPartner | null) {
    if (!p) {
      setPartner((prev) => ({ ...emptyPartner, document: prev.document }));
      return;
    }

    setPartner({
      partnerId: p.id,
      partnerLabel: p.tradeName ?? p.legalName,
      document: p.document,
      legalName: p.legalName,
      tradeName: p.tradeName ?? "",
      email: p.email ?? "",
      zipCode: p.zipCode ?? "",
      street: p.street ?? "",
      number: p.number ?? "",
      complement: p.complement ?? "",
      district: p.district ?? "",
      city: p.city ?? "",
      state: p.state ?? "",
    });
  }

  function applyExpenseItem(p: Product | null) {
    if (!p) {
      setExpenseItemLabel("");
      return;
    }

    setExpenseItemLabel(`${p.code} — ${p.description}`);

    // Só ajuda a preencher — nunca sobrescreve o que a pessoa já digitou.
    setObservation((prev) => prev || p.description);

    const price = Number(p.salePrice ?? 0);
    if (price > 0) {
      setInstallments((prev) =>
        prev.map((row, i) =>
          i === 0 && !row.amount ? { ...row, amount: price } : row
        )
      );
    }

    const productAccountId = isPurchase
      ? p.chartOfAccountId
      : p.saleChartOfAccountId;
    const productAccount = isPurchase
      ? p.chartOfAccount
      : p.saleChartOfAccount;

    if (productAccountId && !chartOfAccountId) {
      setChartOfAccountId(productAccountId);
      setChartOfAccountLabel(
        productAccount
          ? `${productAccount.code} — ${productAccount.description}`
          : ""
      );
    }
  }

  async function applyParsed(parsed: ParsedInvoice) {
    setParseWarnings(parsed.warnings);

    setInvoiceNumber(parsed.invoiceNumber ?? "");
    setInvoiceKey(parsed.invoiceKey ?? "");
    setInvoiceIssueDate(toDateInput(parsed.invoiceIssueDate));
    if (parsed.invoiceKey) setDocumentType("NOTA_FISCAL");

    if (parsed.party) {
      const document = parsed.party.document.replace(/\D/g, "");

      // Tenta achar um cadastro já existente com esse CNPJ/CPF antes
      // de assumir que é parceiro novo.
      let matched: BusinessPartner | null = null;
      try {
        const found = await partnerService.list({
          role: partnerRole,
          search: document,
          limit: 5,
        });
        matched =
          found.data.find((p) => p.document === document) ?? null;
      } catch {
        // Sem sorte na busca — segue com os dados da nota mesmo.
      }

      if (matched) {
        applyPartner(matched);
      } else {
        setPartner({
          partnerId: "",
          partnerLabel: "",
          document,
          legalName: parsed.party.legalName,
          tradeName: parsed.party.tradeName ?? "",
          email: parsed.party.email ?? "",
          zipCode: parsed.party.zipCode ?? "",
          street: parsed.party.street ?? "",
          number: parsed.party.number ?? "",
          complement: parsed.party.complement ?? "",
          district: parsed.party.district ?? "",
          city: parsed.party.city ?? "",
          state: parsed.party.state ?? "",
        });
      }
    }

    if (parsed.items.length > 0) {
      const rows = await Promise.all(
        parsed.items.map(async (item) => {
          let matchedProduct: Product | null = null;

          if (item.ean) {
            try {
              const found = await productService.list({
                barcode: item.ean,
                limit: 1,
              });
              matchedProduct = found.data[0] ?? null;
            } catch {
              // Sem barcode batendo — fica pra escolha manual.
            }
          }

          return {
            productId: matchedProduct?.id ?? "",
            productLabel: matchedProduct
              ? `${matchedProduct.code} — ${matchedProduct.description}`
              : "",
            hint: item.description,
            quantity: String(item.quantity || 1),
            unitPrice: item.unitPrice,
            tracksStock: matchedProduct
              ? matchedProduct.inventoryControl !== "NONE"
              : true,
          };
        })
      );

      setItems(rows);
    }

    if (parsed.installments.length > 0) {
      setInstallments(
        parsed.installments.map((installment) => ({
          days: "",
          dueDate: toDateInput(installment.dueDate),
          amount: installment.amount,
        }))
      );
    } else if (parsed.totalAmount) {
      setInstallments([
        {
          days: "",
          dueDate: toDateInput(parsed.invoiceIssueDate),
          amount: parsed.totalAmount,
        },
      ]);
    }
  }

  async function handleFile(file: File) {
    setParsing(true);
    setParseError("");
    setParseWarnings([]);

    try {
      const parsed = await invoiceImportService.parseXml(file);
      await applyParsed(parsed);
    } catch (err) {
      setParseError(
        extractMessage(err, "Não foi possível ler este arquivo.")
      );
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
      productId: "",
      productLabel: "",
      hint: "",
      quantity: "1",
      unitPrice: 0,
      tracksStock: true,
    },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInstallment(
    index: number,
    patch: Partial<InstallmentRow>
  ) {
    setInstallments((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const next = { ...row, ...patch };

        // Dias preenchido recalcula o vencimento a partir da data de
        // emissão — deixar em branco não mexe: a pessoa digita a
        // data direto.
        if (patch.days !== undefined && patch.days !== "") {
          next.dueDate = toDateInput(
            calculateDueDatePreview(
              invoiceIssueDate || undefined,
              Number(patch.days) || 0
            ).toISOString()
          );
        }

        return next;
      })
    );
  }

  function addInstallment() {
    setInstallments((prev) => [
      ...prev,
      { days: "", dueDate: "", amount: 0 },
    ]);
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  }

  function decimal(value: string) {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function buildPartnerPayload() {
    if (partner.partnerId) {
      return { partnerId: partner.partnerId };
    }

    return {
      document: partner.document,
      legalName: partner.legalName,
      tradeName: partner.tradeName || undefined,
      email: partner.email || undefined,
      zipCode: partner.zipCode || undefined,
      street: partner.street || undefined,
      number: partner.number || undefined,
      complement: partner.complement || undefined,
      district: partner.district || undefined,
      city: partner.city || undefined,
      state: partner.state || undefined,
    };
  }

  async function handleSubmit() {
    setFormError("");

    if (!partner.partnerId && (!partner.document || !partner.legalName)) {
      setFormError(
        `Escolha um ${partnerNoun.toLowerCase()} já cadastrado ou informe CPF/CNPJ e razão social.`
      );
      return;
    }

    setSaving(true);

    try {
      if (mode === "ORDER") {
        const validItems = items.filter(
          (it) => it.productId && decimal(it.quantity) > 0
        );

        if (validItems.length === 0) {
          throw new Error(
            "Adicione ao menos um item com produto e quantidade."
          );
        }

        if (warehouseRequired && !warehouseId) {
          throw new Error("Selecione o depósito.");
        }

        if (!warehouseRequired && !warehouseId && !warehouses[0]) {
          throw new Error(
            "Cadastre um depósito primeiro (é exigido pelo sistema mesmo quando o item não movimenta estoque)."
          );
        }

        const orderInstallments =
          installments.length === 1
            ? [{ dueDate: installments[0].dueDate, amount: itemsTotal }]
            : installments.map((row) => ({
                dueDate: row.dueDate,
                amount: row.amount,
              }));

        if (orderInstallments.some((row) => !row.dueDate)) {
          throw new Error(
            "Preencha o vencimento de todas as parcelas."
          );
        }

        if (
          installments.length > 1 &&
          Math.abs(installmentsTotal - itemsTotal) > 0.01
        ) {
          throw new Error(
            `A soma das parcelas (${money(installmentsTotal)}) precisa bater com o total dos itens (${money(itemsTotal)}).`
          );
        }

        const payload = {
          partner: buildPartnerPayload(),
          warehouseId: warehouseId || warehouses[0]?.id || "",
          chartOfAccountId: chartOfAccountId || undefined,
          invoiceNumber: invoiceNumber || undefined,
          invoiceKey: invoiceKey || undefined,
          invoiceIssueDate: invoiceIssueDate || undefined,
          observation: observation || undefined,
          paymentMethod: paymentMethod || undefined,
          installments: orderInstallments,
          items: validItems.map((it) => ({
            productId: it.productId,
            quantity: decimal(it.quantity),
            unitPrice: it.unitPrice,
          })),
          ...(isPurchase ? { confirmReceipt } : {}),
        };

        if (isPurchase) {
          await invoiceImportService.confirmPurchase(payload);
        } else {
          await invoiceImportService.confirmSale(payload);
        }
      } else {
        if (!invoiceIssueDate) {
          throw new Error("Informe a data de emissão.");
        }

        const validInstallments = installments
          .filter((row) => row.dueDate && row.amount > 0)
          .map((row) => ({ dueDate: row.dueDate, amount: row.amount }));

        if (validInstallments.length === 0) {
          throw new Error(
            "Adicione ao menos uma parcela com vencimento e valor."
          );
        }

        const payload = {
          partner: buildPartnerPayload(),
          chartOfAccountId: chartOfAccountId || undefined,
          issueDate: invoiceIssueDate,
          documentNumber: invoiceNumber || undefined,
          documentKey: invoiceKey || undefined,
          documentType: documentType || undefined,
          paymentMethod: paymentMethod || undefined,
          observation: observation || undefined,
          installments: validInstallments,
        };

        if (isPurchase) {
          await invoiceImportService.confirmPurchaseExpense(payload);
        } else {
          await invoiceImportService.confirmSaleExpense(payload);
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          err instanceof Error
            ? err.message
            : "Não foi possível confirmar a importação."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  const installmentsTotal = installments.reduce(
    (sum, row) => sum + (row.amount || 0),
    0
  );

  const itemsTotal = items.reduce(
    (sum, it) => sum + decimal(it.quantity) * it.unitPrice,
    0
  );

  // Item de serviço/despesa não mexe em estoque — só exige depósito
  // quando algum item de verdade movimenta estoque.
  const warehouseRequired = items.some(
    (it) => it.productId && it.tracksStock
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Importar nota fiscal ({isPurchase ? "compra" : "venda"})
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

        <div className="space-y-5">
          <div className="rounded-xl border border-dashed border-[var(--border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Arquivo XML da nota (opcional)
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  NF-e lê certinho. NF-e de serviço (NFS-e) é melhor
                  esforço — confira os campos antes de confirmar.
                </p>
              </div>

              <button
                type="button"
                disabled={parsing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
              >
                {parsing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {parsing ? "Lendo..." : "Escolher XML"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,text/xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </div>

            {parseError && (
              <p className="mt-2 text-xs text-[var(--danger)]">
                {parseError}
              </p>
            )}

            {parseWarnings.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-[var(--warning)]">
                {parseWarnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2 rounded-xl border border-[var(--border)] p-1">
            <button
              type="button"
              onClick={() => setMode("ORDER")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === "ORDER"
                  ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              Criar Pedido de {isPurchase ? "Compra" : "Venda"}
            </button>

            <button
              type="button"
              onClick={() => setMode("EXPENSE")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === "EXPENSE"
                  ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              Lançar direto em Contas a{" "}
              {isPurchase ? "Pagar" : "Receber"}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className={labelClass}>{partnerNoun}</label>

              <SearchSelect<BusinessPartner>
                displayLabel={partner.partnerLabel}
                search={searchPartners}
                getId={(p) => p.id}
                getLabel={(p) => p.tradeName ?? p.legalName}
                getSubLabel={(p) => p.document}
                placeholder={`Digite para buscar o ${partnerNoun.toLowerCase()}...`}
                onSelect={applyPartner}
              />

              {!partner.partnerId && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    placeholder="CPF/CNPJ"
                    className={fieldClass}
                    value={partner.document}
                    onChange={(e) =>
                      setPartner((p) => ({
                        ...p,
                        document: e.target.value,
                      }))
                    }
                  />
                  <input
                    placeholder="Razão social / nome"
                    className={fieldClass}
                    value={partner.legalName}
                    onChange={(e) =>
                      setPartner((p) => ({
                        ...p,
                        legalName: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Nº da nota</label>
              <input
                className={fieldClass}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Data de emissão</label>
              <input
                type="date"
                className={fieldClass}
                value={invoiceIssueDate}
                onChange={(e) => setInvoiceIssueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Chave de acesso</label>
              <input
                className={fieldClass}
                value={invoiceKey}
                onChange={(e) => setInvoiceKey(e.target.value)}
              />
            </div>

            {mode === "ORDER" && (
              <div>
                <label className={labelClass}>Depósito</label>
                <select
                  className={fieldClass}
                  value={warehouseId}
                  disabled={!warehouseRequired}
                  onChange={(e) => setWarehouseId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.description}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === "EXPENSE" && (
              <div>
                <label className={labelClass}>Tipo do documento</label>
                <select
                  className={fieldClass}
                  value={documentType}
                  onChange={(e) =>
                    setDocumentType(
                      e.target.value as FinancialDocumentType | ""
                    )
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
            )}

            <div>
              <label className={labelClass}>Forma de pagamento</label>
              <select
                className={fieldClass}
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod | "")
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
                {isPurchase ? "Tipo de despesa" : "Tipo de receita"}
              </label>
              <SearchSelect<ChartOfAccount>
                displayLabel={chartOfAccountLabel}
                search={searchChartOfAccounts}
                getId={(c) => c.id}
                getLabel={(c) => `${c.code} — ${c.description}`}
                placeholder="Digite para buscar a conta..."
                onSelect={(c) => {
                  setChartOfAccountId(c?.id ?? "");
                  setChartOfAccountLabel(
                    c ? `${c.code} — ${c.description}` : ""
                  );
                }}
              />
            </div>
          </div>

          {mode === "ORDER" && !warehouseRequired && (
            <p className="text-xs text-[var(--text-muted)]">
              Depósito não é necessário — item não movimenta estoque.
            </p>
          )}

          {mode === "EXPENSE" && (
            <div>
              <label className={labelClass}>Item (produto da despesa)</label>
              <SearchSelect<Product>
                displayLabel={expenseItemLabel}
                search={searchProducts}
                getId={(p) => p.id}
                getLabel={(p) => `${p.code} — ${p.description}`}
                placeholder='Digite para buscar, ex.: "Despesa Pagto Água"...'
                onSelect={applyExpenseItem}
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Opcional — só ajuda a preencher a observação (e o valor,
                se a parcela estiver vazia). Não movimenta estoque.
              </p>
            </div>
          )}

          <div>
            <label className={labelClass}>Observação</label>
            <input
              className={fieldClass}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>

          {isPurchase && mode === "ORDER" && (
            <div className="rounded-lg border border-[var(--border)] p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={confirmReceipt}
                  onChange={(e) => setConfirmReceipt(e.target.checked)}
                />
                Já confirmar recebimento
              </label>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Marcado, a compra entra direto no estoque e gera o título a
                pagar. Desmarcado, a compra fica aprovada aguardando
                recebimento — depois é só conferir a quantidade e bipar os
                produtos na tela de Recebimento.
              </p>
            </div>
          )}

          {mode === "ORDER" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={labelClass}>Itens</label>

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
                {items.map((it, index) => {
                  const subtotal = decimal(it.quantity) * it.unitPrice;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="grid grid-cols-12 items-start gap-2 rounded-xl border border-[var(--border)] p-2">
                        <div className="col-span-5">
                          <SearchSelect<Product>
                            displayLabel={it.productLabel}
                            search={searchProducts}
                            getId={(p) => p.id}
                            getLabel={(p) => `${p.code} — ${p.description}`}
                            placeholder={
                              it.hint
                                ? `Da nota: "${it.hint}" — buscar produto...`
                                : "Digite para buscar o produto..."
                            }
                            onSelect={(p) => {
                              updateItem(index, {
                                productId: p?.id ?? "",
                                productLabel: p
                                  ? `${p.code} — ${p.description}`
                                  : "",
                                tracksStock: p
                                  ? p.inventoryControl !== "NONE"
                                  : true,
                              });

                              const productAccountId = isPurchase
                                ? p?.chartOfAccountId
                                : p?.saleChartOfAccountId;
                              const productAccount = isPurchase
                                ? p?.chartOfAccount
                                : p?.saleChartOfAccount;

                              if (
                                productAccountId &&
                                !chartOfAccountId
                              ) {
                                setChartOfAccountId(
                                  productAccountId
                                );
                                setChartOfAccountLabel(
                                  productAccount
                                    ? `${productAccount.code} — ${productAccount.description}`
                                    : ""
                                );
                              }
                            }}
                          />

                          {it.productId && !it.tracksStock && (
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              Serviço/despesa — não movimenta estoque.
                            </p>
                          )}
                        </div>

                        <input
                          inputMode="decimal"
                          placeholder="Qtd"
                          className={`${fieldClass} col-span-2`}
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(index, { quantity: e.target.value })
                          }
                        />

                        <CurrencyInput
                          placeholder="Preço unit."
                          wrapperClassName="col-span-2"
                          className={fieldClass}
                          value={it.unitPrice}
                          onChange={(value) =>
                            updateItem(index, { unitPrice: value })
                          }
                        />

                        <div className="col-span-2 whitespace-nowrap py-2.5 text-right text-sm font-medium text-[var(--text-primary)]">
                          {money(subtotal)}
                        </div>

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
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-end text-sm font-semibold text-[var(--text-primary)]">
                Total: {money(itemsTotal)}
              </div>
            </div>
          )}

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
                const singleOrderInstallment =
                  mode === "ORDER" && installments.length === 1;

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
                      disabled={singleOrderInstallment}
                      value={
                        singleOrderInstallment ? itemsTotal : row.amount
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
                mode === "ORDER" && installments.length === 1
                  ? itemsTotal
                  : installmentsTotal
              )}
            </div>

            {mode === "ORDER" && installments.length > 1 && (
              <p
                className={`mt-1 text-right text-xs ${
                  Math.abs(installmentsTotal - itemsTotal) > 0.01
                    ? "text-[var(--danger)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                Precisa bater com o total dos itens ({money(itemsTotal)}).
              </p>
            )}
          </div>

          {formError && (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit()}
              className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
            >
              {saving ? "Confirmando..." : "Confirmar importação"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
