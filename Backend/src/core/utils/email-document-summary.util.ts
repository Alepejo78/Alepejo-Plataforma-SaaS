/**
 * Resumo do documento (itens + totais) embutido no corpo dos e-mails
 * automáticos — Cotação, Pedido de Compra, Orçamento, Pedido de
 * Venda. De propósito NÃO recebe depósito/forma de pagamento/tipo de
 * despesa-receita: são dados internos, sem relevância pra quem
 * recebe o e-mail (fornecedor ou cliente).
 */

export interface EmailSummaryItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface EmailSummaryTotals {
  totalAmount: number;
  discountValue?: number;
  freightValue?: number;
  otherExpenses?: number;
  netAmount?: number;
}

export interface EmailSummaryMeta {
  label: string;
  value: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function qty(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function buildEmailDocumentSummaryHtml(opts: {
  items: EmailSummaryItem[];
  totals: EmailSummaryTotals;
  /** Linhas curtas acima da tabela — ex.: "Validade" no Orçamento. */
  meta?: EmailSummaryMeta[];
}): string {
  const cell =
    'padding:6px 8px;border-bottom:1px solid #e5e7eb;';

  const rows = opts.items
    .map(
      (item) => `<tr>
  <td style="${cell}">${escapeHtml(item.description)}</td>
  <td style="${cell}text-align:right;white-space:nowrap;">${qty(item.quantity)}</td>
  <td style="${cell}text-align:right;white-space:nowrap;">${money(item.unitPrice)}</td>
  <td style="${cell}text-align:right;white-space:nowrap;">${money(item.totalPrice)}</td>
</tr>`,
    )
    .join('');

  const metaHtml = opts.meta?.length
    ? `<p style="margin:4px 0;">${opts.meta
        .map((m) => `<strong>${escapeHtml(m.label)}:</strong> ${escapeHtml(m.value)}`)
        .join(' &nbsp;·&nbsp; ')}</p>`
    : '';

  const totalsRows: string[] = [];

  totalsRows.push(
    `<tr><td style="padding:2px 8px;color:#4b5563;">Subtotal</td><td style="padding:2px 8px;text-align:right;">${money(opts.totals.totalAmount)}</td></tr>`,
  );

  if (opts.totals.discountValue) {
    totalsRows.push(
      `<tr><td style="padding:2px 8px;color:#4b5563;">Desconto</td><td style="padding:2px 8px;text-align:right;">- ${money(opts.totals.discountValue)}</td></tr>`,
    );
  }

  if (opts.totals.freightValue) {
    totalsRows.push(
      `<tr><td style="padding:2px 8px;color:#4b5563;">Frete</td><td style="padding:2px 8px;text-align:right;">${money(opts.totals.freightValue)}</td></tr>`,
    );
  }

  if (opts.totals.otherExpenses) {
    totalsRows.push(
      `<tr><td style="padding:2px 8px;color:#4b5563;">Outras despesas</td><td style="padding:2px 8px;text-align:right;">${money(opts.totals.otherExpenses)}</td></tr>`,
    );
  }

  if (opts.totals.netAmount != null) {
    totalsRows.push(
      `<tr><td style="padding:4px 8px;font-weight:bold;">Total</td><td style="padding:4px 8px;text-align:right;font-weight:bold;">${money(opts.totals.netAmount)}</td></tr>`,
    );
  }

  return `${metaHtml}
<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th style="text-align:left;padding:6px 8px;">Item</th>
      <th style="text-align:right;padding:6px 8px;">Qtd.</th>
      <th style="text-align:right;padding:6px 8px;">Vl.Unit.</th>
      <th style="text-align:right;padding:6px 8px;">Vl.Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<table style="width:280px;margin-left:auto;font-size:13px;">
  <tbody>${totalsRows.join('')}</tbody>
</table>`;
}
