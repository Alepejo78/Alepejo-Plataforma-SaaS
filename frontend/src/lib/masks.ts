/**
 * Máscaras de formatação para campos brasileiros.
 *
 * Convenção do projeto: a máscara existe apenas para exibição.
 * O valor enviado à API é sempre "só dígitos" (ver onlyDigits),
 * para que a checagem de duplicidade de documento não trate
 * "12.345.678/0001-90" e "12345678000190" como cadastros diferentes.
 */

export function onlyDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

/** 000.000.000-00 */
export function maskCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** 00.000.000/0000-00 */
export function maskCNPJ(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);

  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/**
 * Aplica CPF ou CNPJ conforme o tipo de pessoa.
 * Quando o tipo não é informado, decide pelo tamanho: até 11
 * dígitos trata como CPF.
 */
export function maskDocument(
  value: string,
  personType?: "INDIVIDUAL" | "COMPANY"
): string {
  const digits = onlyDigits(value);

  if (personType === "INDIVIDUAL") {
    return maskCPF(digits);
  }

  if (personType === "COMPANY") {
    return maskCNPJ(digits);
  }

  return digits.length <= 11
    ? maskCPF(digits)
    : maskCNPJ(digits);
}

/** (00) 0000-0000 ou (00) 00000-0000 */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

/** 00000-000 */
export function maskCEP(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);

  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

/** 00.00.00 — código de conta do plano de contas */
export function maskAccountCode(value: string): string {
  const digits = onlyDigits(value).slice(0, 6);

  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{2})\.(\d{2})(\d{1,2})$/, "$1.$2.$3");
}

export function isValidCNPJLength(value: string): boolean {
  return onlyDigits(value).length === 14;
}

export function isValidCEPLength(value: string): boolean {
  return onlyDigits(value).length === 8;
}
