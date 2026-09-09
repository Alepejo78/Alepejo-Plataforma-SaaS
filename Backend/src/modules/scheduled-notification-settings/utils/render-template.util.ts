/** Substitui `{{chave}}` pelo valor correspondente em `vars` — chave não encontrada vira string vazia, nunca quebra o envio. */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : '',
  );
}

/** Cola cabeçalho/rodapé (quando configurados) em volta do texto puro (WhatsApp). */
export function wrapPlainText(
  message: string,
  header: string | null | undefined,
  footer: string | null | undefined,
): string {
  const parts = [header?.trim(), message, footer?.trim()].filter(
    (part): part is string => !!part,
  );

  return parts.join('\n\n');
}

/** Mesma ideia de `wrapPlainText`, em HTML (e-mail) — cada parte vira um `<p>`. */
export function wrapHtml(
  messageHtml: string,
  header: string | null | undefined,
  footer: string | null | undefined,
): string {
  const parts = [
    header?.trim() ? `<p>${header.trim()}</p>` : '',
    messageHtml,
    footer?.trim() ? `<p>${footer.trim()}</p>` : '',
  ].filter(Boolean);

  return parts.join('');
}
