/**
 * Resumo do documento (itens + totais) embutido no corpo dos e-mails
 * automáticos — Cotação, Pedido de Compra, Orçamento, Pedido de
 * Venda. De propósito NÃO recebe depósito/tipo de despesa-receita:
 * são dados internos, sem relevância pra quem recebe o e-mail
 * (fornecedor ou cliente). `paymentTerms` é a exceção — forma de
 * pagamento e parcelas SÃO relevantes quando é o cliente confirmando
 * o que ficou combinado (ver Pedido de Venda gerado na aprovação
 * digital do orçamento), então é opcional, só passado por quem
 * precisa mostrar isso.
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

export interface EmailSummaryInstallment {
  dueDate: string;
  amount: number;
}

export interface EmailSummaryPaymentTerms {
  methodLabel?: string;
  /** Uma linha = pagamento único; mais de uma = parcelado. */
  installments: EmailSummaryInstallment[];
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
  /** Forma de pagamento e parcelas — ver comentário do arquivo. */
  paymentTerms?: EmailSummaryPaymentTerms;
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

  const paymentTermsHtml = buildPaymentTermsHtml(opts.paymentTerms);

  return `${metaHtml}
<table style="width:auto;max-width:520px;border-collapse:collapse;margin:12px 0;font-size:13px;">
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
<table style="width:280px;font-size:13px;">
  <tbody>${totalsRows.join('')}</tbody>
</table>
${paymentTermsHtml}`;
}

/**
 * Mesmo resumo de `buildEmailDocumentSummaryHtml`, só que com os
 * itens divididos em grupos separados (cada um com título e tabela
 * própria) — usado na Ordem de Serviço, que sempre mostra "Serviços
 * Realizados" e "Produtos e Materiais Usados" à parte (tela, e-mail
 * e PDF), nunca misturados numa lista só.
 */
export function buildTwoGroupEmailSummaryHtml(opts: {
  groups: { title: string; items: EmailSummaryItem[] }[];
  totals: EmailSummaryTotals;
  meta?: EmailSummaryMeta[];
  paymentTerms?: EmailSummaryPaymentTerms;
}): string {
  const cell = 'padding:6px 8px;border-bottom:1px solid #e5e7eb;';

  const metaHtml = opts.meta?.length
    ? `<p style="margin:4px 0;">${opts.meta
        .map((m) => `<strong>${escapeHtml(m.label)}:</strong> ${escapeHtml(m.value)}`)
        .join(' &nbsp;·&nbsp; ')}</p>`
    : '';

  const groupsHtml = opts.groups
    .filter((group) => group.items.length > 0)
    .map((group) => {
      const rows = group.items
        .map(
          (item) => `<tr>
  <td style="${cell}">${escapeHtml(item.description)}</td>
  <td style="${cell}text-align:right;white-space:nowrap;">${qty(item.quantity)}</td>
  <td style="${cell}text-align:right;white-space:nowrap;">${money(item.unitPrice)}</td>
  <td style="${cell}text-align:right;white-space:nowrap;">${money(item.totalPrice)}</td>
</tr>`,
        )
        .join('');

      return `<p style="margin:12px 0 4px;font-weight:bold;font-size:13px;">${escapeHtml(group.title)}</p>
<table style="width:auto;max-width:520px;border-collapse:collapse;margin:4px 0;font-size:13px;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th style="text-align:left;padding:6px 8px;">Item</th>
      <th style="text-align:right;padding:6px 8px;">Qtd.</th>
      <th style="text-align:right;padding:6px 8px;">Vl.Unit.</th>
      <th style="text-align:right;padding:6px 8px;">Vl.Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
    })
    .join('');

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

  const paymentTermsHtml = buildPaymentTermsHtml(opts.paymentTerms);

  return `${metaHtml}${groupsHtml}
<table style="width:280px;font-size:13px;margin-top:8px;">
  <tbody>${totalsRows.join('')}</tbody>
</table>
${paymentTermsHtml}`;
}

function buildPaymentTermsHtml(
  paymentTerms: EmailSummaryPaymentTerms | undefined,
): string {
  if (!paymentTerms || paymentTerms.installments.length === 0) {
    return '';
  }

  const { methodLabel, installments } = paymentTerms;

  if (installments.length === 1) {
    const line = [
      methodLabel && `<strong>Forma de pagamento:</strong> ${escapeHtml(methodLabel)}`,
      `<strong>Vencimento:</strong> ${escapeHtml(installments[0].dueDate)}`,
    ]
      .filter(Boolean)
      .join(' &nbsp;·&nbsp; ');

    return `<p style="margin:8px 0 4px;font-size:13px;">${line}</p>`;
  }

  const rows = installments
    .map(
      (installment, index) => `<tr>
  <td style="padding:2px 8px;color:#4b5563;">${index + 1}/${installments.length}</td>
  <td style="padding:2px 8px;">${escapeHtml(installment.dueDate)}</td>
  <td style="padding:2px 8px;text-align:right;">${money(installment.amount)}</td>
</tr>`,
    )
    .join('');

  return `<p style="margin:8px 0 4px;font-size:13px;">${
    methodLabel
      ? `<strong>Forma de pagamento:</strong> ${escapeHtml(methodLabel)} — parcelado em ${installments.length}x`
      : `Parcelado em ${installments.length}x`
  }</p>
<table style="width:280px;font-size:13px;border-collapse:collapse;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th style="text-align:left;padding:4px 8px;">Parcela</th>
      <th style="text-align:left;padding:4px 8px;">Vencimento</th>
      <th style="text-align:right;padding:4px 8px;">Valor</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}
