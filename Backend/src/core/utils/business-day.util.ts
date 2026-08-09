/**
 * Se a data cair em sábado (6) ou domingo (0), empurra para a
 * próxima segunda-feira. Usa componentes UTC para não sofrer
 * deslocamento de fuso horário em datas gravadas como meia-noite.
 */
export function toNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDay();

  if (day === 6) {
    result.setUTCDate(result.getUTCDate() + 2);
  } else if (day === 0) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  return result;
}

/** Vencimento = data de emissão + prazo em dias, ajustado para dia útil. */
export function calculateDueDate(
  issueDate: Date,
  termDays: number,
): Date {
  const dueDate = new Date(issueDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + termDays);

  return toNextBusinessDay(dueDate);
}
