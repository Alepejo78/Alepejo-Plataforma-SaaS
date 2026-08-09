/** Empurra sábado/domingo para a próxima segunda-feira. */
function toNextBusinessDay(value: Date): Date {
  const result = new Date(value);
  const day = result.getUTCDay();

  if (day === 6) {
    result.setUTCDate(result.getUTCDate() + 2);
  } else if (day === 0) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  return result;
}

/**
 * Prévia do vencimento: data + prazo em dias, ajustado para nunca
 * cair em sábado ou domingo. O valor definitivo é sempre recalculado
 * pelo backend ao salvar.
 */
export function calculateDueDatePreview(
  isoDate: string | undefined,
  termDays: number
): Date {
  const base = isoDate ? new Date(`${isoDate}T00:00:00Z`) : new Date();
  const due = new Date(base);

  due.setUTCDate(due.getUTCDate() + termDays);

  return toNextBusinessDay(due);
}
