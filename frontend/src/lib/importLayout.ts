import { buildXlsx } from "./xlsxWriter";
import { saveExportFile } from "./exportTable";

/** Baixa o layout padrão (.xlsx) de uma importação — cabeçalho + uma linha de exemplo preenchida. */
export async function downloadImportLayout(
  headers: string[],
  example: string[],
  filename: string
) {
  await saveExportFile(
    buildXlsx({ headers, rows: [example] }, filename),
    `${filename}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}
