/** Escapa um valor para CSV — aspas duplas quando tem vírgula, aspas ou quebra de linha. */
function escapeCsvValue(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * Gera um CSV e dispara o download no navegador. BOM UTF-8 na frente
 * pra acentuação abrir certo no Excel (sem ele, "ç"/"ã" viram lixo).
 */
export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvValue).join(",")
  );

  const bom = String.fromCharCode(0xfeff);
  const csv = bom + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv")
    ? filename
    : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
