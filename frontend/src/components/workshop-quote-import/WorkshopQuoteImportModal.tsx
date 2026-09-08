"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";

import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/services/financial-entry.service";
import {
  workshopQuoteImportService,
  type ParsedWorkshopQuote,
  type WorkshopQuoteParsedItem,
} from "@/services/workshop-quote-import.service";

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

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function WorkshopQuoteImportModal({ onClose, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  const [parsed, setParsed] = useState<ParsedWorkshopQuote | null>(null);
  const [items, setItems] = useState<WorkshopQuoteParsedItem[]>([]);

  const [document_, setDocument] = useState("");
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [existingPartnerId, setExistingPartnerId] = useState<string | null>(
    null
  );

  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("DINHEIRO");
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [termDays, setTermDays] = useState(0);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<{
    entriesCreated: number;
    createdProducts: string[];
  } | null>(null);

  async function handleFile(file: File) {
    setParsing(true);
    setParseError("");
    setResult(null);

    try {
      const data = await workshopQuoteImportService.parseFile(file);
      setParsed(data);
      setItems(data.items);

      setDocument(data.partner.document ?? "");
      setLegalName(data.partner.legalName ?? "");
      setPhone(data.partner.phone ?? "");
      setMobile(data.partner.mobile ?? "");
      setZipCode(data.partner.zipCode ?? "");
      setStreet(data.partner.street ?? "");
      setNumber(data.partner.number ?? "");
      setComplement(data.partner.complement ?? "");
      setCity(data.partner.city ?? "");
      setState(data.partner.state ?? "");
      setExistingPartnerId(data.partner.existingPartnerId);

      setDocumentNumber(data.documentNumber ?? "");
      setIssueDate(data.issueDate ?? "");
      setPaymentMethod(data.paymentMethod);
      setInstallmentsCount(data.installmentsCount);
      setTermDays(data.termDays);
    } catch (err) {
      setParseError(
        extractMessage(err, "Não foi possível ler este PDF.")
      );
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateItem(index: number, patch: Partial<WorkshopQuoteParsedItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  const total = items.reduce((sum, it) => sum + it.netValue, 0);

  async function handleSubmit() {
    setFormError("");

    if (!document_ && !existingPartnerId) {
      setFormError("Informe o CPF/CNPJ do cliente.");
      return;
    }

    if (!legalName && !existingPartnerId) {
      setFormError("Informe o nome do cliente.");
      return;
    }

    if (!documentNumber) {
      setFormError("Informe o número do orçamento.");
      return;
    }

    if (!issueDate) {
      setFormError("Informe a data de abertura.");
      return;
    }

    if (items.length === 0) {
      setFormError("Nenhum item de peça/serviço pra importar.");
      return;
    }

    setSaving(true);

    try {
      const response = await workshopQuoteImportService.confirm({
        partner: existingPartnerId
          ? { partnerId: existingPartnerId }
          : {
              document: document_,
              legalName,
              phone: phone || undefined,
              mobile: mobile || undefined,
              zipCode: zipCode || undefined,
              street: street || undefined,
              number: number || undefined,
              complement: complement || undefined,
              city: city || undefined,
              state: state || undefined,
            },
        documentNumber,
        issueDate,
        paymentMethod,
        installmentsCount,
        termDays,
        items: items.map((it) => ({
          kind: it.kind,
          code: it.code,
          description: it.description,
          unit: it.unit,
          quantity: it.quantity,
          netValue: it.netValue,
          grossValue: it.grossValue,
        })),
      });

      setResult(response);
      onSaved();
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível confirmar a importação.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Importar orçamento de oficina (PDF)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Gera um título a receber por item (peça e serviço separados) —
              cadastra cliente e produto/serviço automaticamente quando não
              existirem.
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

        {result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-4 text-sm text-[var(--success)]">
              {result.entriesCreated} título(s) a receber criado(s).
              {result.createdProducts.length > 0 && (
                <> Produto(s)/serviço(s) cadastrados: {result.createdProducts.join(", ")}.</>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)]"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-dashed border-[var(--border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Arquivo do orçamento (PDF)
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Leitura automática — sempre confira os dados antes de
                    confirmar.
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
                  {parsing ? "Lendo..." : "Escolher PDF"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
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

              {parsed && parsed.warnings.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-[var(--warning)]">
                  {parsed.warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              )}
            </div>

            {parsed && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Nº do orçamento</label>
                    <input
                      className={fieldClass}
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Data de abertura</label>
                    <input
                      type="date"
                      className={fieldClass}
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Forma de pagamento</label>
                    <select
                      className={fieldClass}
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as PaymentMethod)
                      }
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                    {parsed.paymentMethodText && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        No orçamento: &quot;{parsed.paymentMethodText}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-5">
                  <div>
                    <label className={labelClass}>CPF/CNPJ</label>
                    <input
                      className={fieldClass}
                      value={document_}
                      disabled={!!existingPartnerId}
                      onChange={(e) => setDocument(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className={labelClass}>Nome do cliente</label>
                    <input
                      className={fieldClass}
                      value={legalName}
                      disabled={!!existingPartnerId}
                      onChange={(e) => setLegalName(e.target.value)}
                    />
                  </div>
                </div>

                {existingPartnerId ? (
                  <p className="text-xs text-[var(--success)]">
                    Cliente já cadastrado — vai usar o cadastro existente.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-[var(--warning)]">
                      Cliente não encontrado — será cadastrado com estes
                      dados.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-6">
                      <input
                        placeholder="Telefone"
                        className={`${fieldClass} sm:col-span-1`}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <input
                        placeholder="Celular"
                        className={`${fieldClass} sm:col-span-1`}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                      <input
                        placeholder="CEP"
                        className={`${fieldClass} sm:col-span-1`}
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                      />
                      <input
                        placeholder="Rua"
                        className={`${fieldClass} sm:col-span-2`}
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                      />
                      <input
                        placeholder="Número"
                        className={`${fieldClass} sm:col-span-1`}
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                      />
                      <input
                        placeholder="Complemento"
                        className={`${fieldClass} sm:col-span-2`}
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                      />
                      <input
                        placeholder="Cidade"
                        className={`${fieldClass} sm:col-span-2`}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                      <input
                        placeholder="UF"
                        className={`${fieldClass} sm:col-span-1`}
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className={labelClass}>Itens</label>

                  <div className="space-y-2">
                    {items.map((it, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 items-center gap-2 rounded-xl border border-[var(--border)] p-2"
                      >
                        <span className="col-span-1 rounded-lg bg-[var(--surface-hover)] px-2 py-1 text-center text-xs font-medium text-[var(--text-secondary)]">
                          {it.kind === "PART" ? "Peça" : "Serviço"}
                        </span>

                        <input
                          className={`${fieldClass} col-span-1`}
                          value={it.code}
                          onChange={(e) =>
                            updateItem(index, { code: e.target.value })
                          }
                        />

                        <input
                          className={`${fieldClass} col-span-5`}
                          value={it.description}
                          onChange={(e) =>
                            updateItem(index, { description: e.target.value })
                          }
                        />

                        <input
                          className={`${fieldClass} col-span-1`}
                          title="Unidade"
                          value={it.unit}
                          onChange={(e) =>
                            updateItem(index, { unit: e.target.value })
                          }
                        />

                        <input
                          inputMode="decimal"
                          title="Quantidade"
                          className={`${fieldClass} col-span-1`}
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(index, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                        />

                        <CurrencyInput
                          placeholder="Valor"
                          wrapperClassName="col-span-3"
                          className={fieldClass}
                          value={it.netValue}
                          onChange={(value) =>
                            updateItem(index, { netValue: value })
                          }
                        />

                        <span
                          className="col-span-12 -mt-1 text-xs text-[var(--text-muted)]"
                          title="Cadastro"
                        >
                          {it.existingProductId
                            ? "Produto/serviço já cadastrado — código " + it.code
                            : "Não cadastrado — será criado como " +
                              (it.kind === "PART" ? "Produto" : "Serviço") +
                              ", sem controle de estoque."}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end text-sm font-semibold text-[var(--text-primary)]">
                    Total: {money(total)}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Parcelas</label>
                    <input
                      type="number"
                      min={1}
                      className={fieldClass}
                      value={installmentsCount}
                      onChange={(e) =>
                        setInstallmentsCount(Number(e.target.value) || 1)
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Dias entre parcelas (0 = à vista, vence no lançamento)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={fieldClass}
                      value={termDays}
                      onChange={(e) =>
                        setTermDays(Number(e.target.value) || 0)
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
