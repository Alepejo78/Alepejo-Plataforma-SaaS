"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { downloadImportLayout } from "@/lib/importLayout";
import { buildCsv, saveExportFile } from "@/lib/exportTable";
import {
  employeeImportService,
  type EmployeeImportRowData,
} from "@/services/employee-import.service";
import type { ImportPreview } from "@/services/product-import.service";

const LAYOUT_HEADERS = [
  "Nome*",
  "CPF",
  "RG",
  "PIS",
  "Data Nascimento",
  "Gênero",
  "Estado Civil",
  "Escolaridade",
  "Telefone",
  "Celular",
  "Email",
  "CEP",
  "Logradouro",
  "Número",
  "Bairro",
  "Cidade",
  "UF",
  "Função",
  "Setor",
  "Horário de Trabalho",
  "Salário Base",
  "Tipo Salário",
  "Forma Pagamento",
  "Data Admissão",
  "Status",
  "Banco",
  "Agência",
  "Conta",
  "Tipo Conta",
  "Tipo Chave PIX",
  "Chave PIX",
  "Observações",
];

const LAYOUT_EXAMPLE = [
  "João da Silva",
  "12345678900",
  "1234567",
  "12345678901",
  "1990-05-20",
  "MASCULINO",
  "CASADO",
  "MEDIO_COMPLETO",
  "1133334444",
  "11988887777",
  "joao@exemplo.com.br",
  "01310-100",
  "Av. Paulista",
  "1000",
  "Bela Vista",
  "São Paulo",
  "SP",
  "Auxiliar Administrativo",
  "Administrativo",
  "Comercial 8h-18h",
  "3000",
  "MENSALISTA",
  "PIX",
  "2024-01-10",
  "ATIVO",
  "Banco do Brasil",
  "1234",
  "56789-0",
  "CORRENTE",
  "CPF",
  "12345678900",
  "Observação opcional",
];

function extractMessage(err: unknown, fallback: string) {
  const message = (err as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;

  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string" ? message : fallback;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function EmployeeImportModal({ onClose, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [preview, setPreview] = useState<
    ImportPreview<EmployeeImportRowData> | null
  >(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [result, setResult] = useState<{
    created: number;
    updated: number;
  } | null>(null);

  async function handleFile(file: File) {
    setParsing(true);
    setParseError("");
    setPreview(null);
    setResult(null);

    try {
      const parsed = await employeeImportService.parse(file);
      setPreview(parsed);
    } catch (err) {
      setParseError(extractMessage(err, "Não foi possível ler a planilha."));
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirm() {
    if (!preview) return;

    const rows = preview.rows
      .filter((r) => r.action !== "error")
      .map((r) => ({
        ...r.data,
        action: r.action as "create" | "update",
      }));

    if (rows.length === 0) return;

    setConfirming(true);
    setConfirmError("");

    try {
      const res = await employeeImportService.confirm(rows);
      setResult(res);
      onSaved();
    } catch (err) {
      setConfirmError(
        extractMessage(err, "Não foi possível confirmar a importação.")
      );
    } finally {
      setConfirming(false);
    }
  }

  function downloadErrorReport() {
    if (!preview) return;

    const errorRows = preview.rows.filter((r) => r.action === "error");
    void saveExportFile(
      buildCsv({
        headers: ["Linha", "Nome", "Erros"],
        rows: errorRows.map((r) => [
          String(r.line),
          r.data.name ?? "",
          r.errors.join(" | "),
        ]),
      }),
      "erros-importacao-colaboradores.csv",
      "text/csv"
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-5xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Importar colaboradores via planilha
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

        {result ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-4 text-sm text-[var(--success)]">
              <CheckCircle2 size={20} />
              Importação concluída: {result.created} colaborador(es)
              criado(s), {result.updated} atualizado(s).
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Planilha de colaboradores (.xlsx ou .csv)
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    CPF já cadastrado atualiza o colaborador; sem CPF ou CPF
                    novo, sempre cria. Função e Setor são criados
                    automaticamente se não existirem; Horário de Trabalho
                    precisa já estar cadastrado.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void downloadImportLayout(
                        LAYOUT_HEADERS,
                        LAYOUT_EXAMPLE,
                        "layout-importacao-colaboradores"
                      )
                    }
                    className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <Download size={16} />
                    Baixar layout
                  </button>

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
                    {parsing ? "Lendo..." : "Escolher planilha"}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                    }}
                  />
                </div>
              </div>

              {parseError && (
                <p className="mt-2 text-xs text-[var(--danger)]">
                  {parseError}
                </p>
              )}
            </div>

            {preview && (
              <>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded-lg bg-[var(--success-soft)] px-3 py-1.5 font-medium text-[var(--success)]">
                    {preview.toCreate} para criar
                  </span>
                  <span className="rounded-lg bg-[var(--surface-hover)] px-3 py-1.5 font-medium text-[var(--text-primary)]">
                    {preview.toUpdate} para atualizar
                  </span>
                  {preview.toError > 0 && (
                    <span className="rounded-lg bg-[var(--danger-soft)] px-3 py-1.5 font-medium text-[var(--danger)]">
                      {preview.toError} com erro
                    </span>
                  )}
                </div>

                <div className="max-h-96 overflow-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[var(--surface-hover)] text-left text-xs text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-3 py-2">Linha</th>
                        <th className="px-3 py-2">Situação</th>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">CPF</th>
                        <th className="px-3 py-2">Detalhe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr
                          key={row.line}
                          className="border-t border-[var(--border)]"
                        >
                          <td className="px-3 py-2">{row.line}</td>
                          <td className="px-3 py-2">
                            {row.action === "create" && (
                              <span className="text-[var(--success)]">
                                Criar
                              </span>
                            )}
                            {row.action === "update" && (
                              <span className="text-[var(--text-primary)]">
                                Atualizar
                              </span>
                            )}
                            {row.action === "error" && (
                              <span className="flex items-center gap-1 text-[var(--danger)]">
                                <AlertTriangle size={14} />
                                Erro
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">{row.data.name}</td>
                          <td className="px-3 py-2">{row.data.cpf}</td>
                          <td className="px-3 py-2 text-xs text-[var(--danger)]">
                            {row.errors.join(" ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {preview.toError > 0 && (
                  <button
                    type="button"
                    onClick={downloadErrorReport}
                    className="text-xs font-medium text-[var(--primary)] underline"
                  >
                    Baixar relatório de erros
                  </button>
                )}
              </>
            )}

            {confirmError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {confirmError}
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
                disabled={
                  !preview ||
                  confirming ||
                  preview.toCreate + preview.toUpdate === 0
                }
                onClick={() => void handleConfirm()}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
              >
                {confirming
                  ? "Confirmando..."
                  : `Confirmar importação${
                      preview
                        ? ` (${preview.toCreate + preview.toUpdate})`
                        : ""
                    }`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
