import type { RefObject } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";

import {
  buildCsv,
  extractTableData,
  type TableExportData,
  saveExportFile,
} from "@/lib/exportTable";
import { buildXlsx } from "@/lib/xlsxWriter";
import type { MenuButtonItem } from "@/components/ui/MenuButton";

interface BuildExportMenuItemsParams {
  /** Ref da <table> a ser lida — ignorado quando `getData` é informado. */
  tableRef?: RefObject<HTMLTableElement | null>;
  /** Monta os dados a exportar direto do estado da tela (ver `ExportButton`). */
  getData?: () => TableExportData;
  filename: string;
  sheetName?: string;
}

/** Mesma lógica de `ExportButton`, só que como itens de `MenuButton` (submenu "Exportar" dentro de um botão agrupado). */
export function buildExportMenuItems({
  tableRef,
  getData,
  filename,
  sheetName,
}: BuildExportMenuItemsParams): MenuButtonItem[] {
  function handleExport(format: "csv" | "xlsx") {
    const table = tableRef?.current ?? null;

    if (!getData && !table) return;

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

  return [
    {
      label: "Exportar CSV",
      icon: <FileText size={16} />,
      onClick: () => handleExport("csv"),
    },
    {
      label: "Exportar Excel",
      icon: <FileSpreadsheet size={16} />,
      onClick: () => handleExport("xlsx"),
    },
  ];
}
