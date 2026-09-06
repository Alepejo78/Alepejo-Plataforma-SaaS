"use client";

import { useState, type RefObject } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

import {
  buildCsv,
  extractTableData,
  type TableExportData,
  saveExportFile,
} from "@/lib/exportTable";
import { buildXlsx } from "@/lib/xlsxWriter";

interface ExportButtonProps {
  /**
   * Ref da <table> que será lida (cabeçalho + linhas visíveis na tela).
   * Ignorado quando `getData` é informado.
   */
  tableRef?: RefObject<HTMLTableElement | null>;
  /**
   * Monta os dados a exportar direto do estado da tela — usar sempre
   * que a tabela mostrar menos campos do que o cadastro tem, ou juntar
   * mais de um campo numa mesma célula (ex.: nome + apelido na mesma
   * coluna), pra não exportar dado faltando ou concatenado.
   */
  getData?: () => TableExportData;
  /** Nome do arquivo, sem extensão. */
  filename: string;
  /** Nome da aba na planilha Excel — usa `filename` se não informado. */
  sheetName?: string;
}

/**
 * Ícone "Exportar para..." — abre um menu com CSV/Excel; ao escolher, o
 * navegador (Chrome/Edge) abre o "Salvar como" de verdade, ou baixa pra
 * pasta padrão nos demais.
 */
export function ExportButton({
  tableRef,
  getData,
  filename,
  sheetName,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  function handleExport(format: "csv" | "xlsx") {
    setOpen(false);

    const table = tableRef?.current ?? null;

    if (!getData && !table) {
      return;
    }

    const data = getData ? getData() : extractTableData(table!);

    if (format === "csv") {
      void saveExportFile(buildCsv(data), `${filename}.csv`, "text/csv");
    } else {
      void saveExportFile(
        buildXlsx(data, sheetName ?? filename),
        `${filename}.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Exportar para..."
        aria-label="Exportar para..."
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      >
        <Download size={16} />
        Exportar
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 z-20 mt-2 w-52 space-y-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <FileText size={16} />
              Exportar CSV
            </button>

            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
