const UNITS = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
];

const TEENS = [
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const TENS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const HUNDREDS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function threeDigitsToWords(n: number): string {
  if (n === 0) {
    return "";
  }

  if (n === 100) {
    return "cem";
  }

  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];

  if (h > 0) {
    parts.push(HUNDREDS[h]);
  }

  if (rest > 0) {
    if (rest < 10) {
      parts.push(UNITS[rest]);
    } else if (rest < 20) {
      parts.push(TEENS[rest - 10]);
    } else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;

      parts.push(u > 0 ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
    }
  }

  return parts.join(" e ");
}

/** Converte a parte inteira de um valor (até 999.999.999) para extenso, em pt-BR. */
function integerToWords(value: number): string {
  if (value === 0) {
    return "zero";
  }

  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1000);
  const units = value % 1000;

  const parts: string[] = [];

  if (millions > 0) {
    parts.push(
      millions === 1
        ? "um milhão"
        : `${threeDigitsToWords(millions)} milhões`
    );
  }

  if (thousands > 0) {
    parts.push(
      thousands === 1
        ? "mil"
        : `${threeDigitsToWords(thousands)} mil`
    );
  }

  if (units > 0) {
    parts.push(threeDigitsToWords(units));
  }

  return parts.join(" e ");
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Converte um valor monetário em reais para extenso (ex.: "Um mil, duzentos e sessenta e quatro reais e trinta e um centavos"). */
export function currencyToWordsPtBr(value: number): string {
  const rounded = Math.round(Math.abs(value) * 100) / 100;
  const reais = Math.floor(rounded);
  const cents = Math.round((rounded - reais) * 100);

  const reaisLabel = reais === 1 ? "real" : "reais";
  const centsLabel = cents === 1 ? "centavo" : "centavos";

  const reaisWords = `${integerToWords(reais)} ${reaisLabel}`;

  if (cents === 0) {
    return capitalize(reaisWords);
  }

  return capitalize(
    `${reaisWords} e ${integerToWords(cents)} ${centsLabel}`
  );
}
