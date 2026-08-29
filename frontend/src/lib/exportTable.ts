export interface TableExportData {
  headers: string[];
  rows: string[][];
}

/** Lê um <table> renderizado na tela e extrai cabeçalho + linhas como texto puro. */
export function extractTableData(table: HTMLTableElement): TableExportData {
  const headers = Array.from(table.querySelectorAll("thead th")).map(
    (th) => th.textContent?.trim() ?? ""
  );

  const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td")).map(
      (td) => td.textContent?.trim() ?? ""
    )
  );

  return { headers, rows };
}

function csvEscape(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * CSV com ponto e vírgula (padrão do Excel em pt-BR — vírgula já é usada
 * como separador decimal nos valores) e BOM UTF-8 (acentuação correta ao
 * abrir direto no Excel).
 */
export function buildCsv({ headers, rows }: TableExportData): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(csvEscape).join(";")
  );

  return "﻿" + lines.join("\r\n");
}

interface SaveFilePickerOptions {
  suggestedName: string;
  types: {
    description: string;
    accept: Record<string, string[]>;
  }[];
}

interface FileSystemWritableFileStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

type WindowWithSavePicker = Window & {
  showSaveFilePicker?: (
    options: SaveFilePickerOptions
  ) => Promise<FileSystemFileHandle>;
};

/**
 * Salva o arquivo — no Chrome/Edge abre o "Salvar como" de verdade
 * (escolhe pasta e nome); nos demais navegadores cai no download comum
 * (vai pra pasta de downloads padrão do navegador).
 */
export async function saveExportFile(
  content: BlobPart,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType });
  const extension = filename.slice(filename.lastIndexOf("."));

  const picker = (window as WindowWithSavePicker).showSaveFilePicker;

  if (typeof picker === "function") {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [
          {
            description: mimeType,
            accept: { [mimeType]: [extension] },
          },
        ],
      });

      const writable = await handle.createWritable();

      await writable.write(blob);
      await writable.close();

      return;
    } catch (err) {
      // Cancelou o "Salvar como" — não faz nada (não cai pro fallback,
      // senão baixaria sozinho depois de cancelar).
      if ((err as { name?: string })?.name === "AbortError") {
        return;
      }
      // Qualquer outro erro (raro): cai pro download comum abaixo.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
