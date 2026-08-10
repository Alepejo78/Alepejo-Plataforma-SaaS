"use client";

import { useEffect, useState } from "react";

function digitsToAmount(digits: string): number {
  if (!digits) {
    return 0;
  }

  return Number(digits) / 100;
}

function amountToDisplay(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface CurrencyInputProps {
  id?: string;
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  /** Classes visuais do campo em si (borda, fundo, altura) — vai no `<input>`. */
  className?: string;
  /**
   * Classes de layout do container (`col-span-*`, largura fixa) — vai no
   * `<div>` que envolve o campo. Nunca misturar essas classes em
   * `className`: como o `<input>` fica dentro de um wrapper para caber o
   * prefixo "R$", uma classe de grid/largura no `<input>` não afeta o
   * item do grid/flex por fora, e some sem efeito.
   */
  wrapperClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  /** Esconde o prefixo "R$" — útil em grades densas (muitas colunas) onde não há espaço sobrando. A máscara continua igual. */
  showPrefix?: boolean;
}

/**
 * Campo de valor em reais com máscara "centavos primeiro" (digita da
 * direita pra esquerda, tipo caixa eletrônico/app de banco): cada dígito
 * novo entra nos centavos e empurra o resto. Sempre entrega um número
 * (reais, com centavos) via onChange — nunca string pra fazer parse.
 */
export function CurrencyInput({
  id,
  value,
  onChange,
  className = "",
  wrapperClassName = "",
  placeholder = "0,00",
  disabled,
  autoFocus,
  onBlur,
  showPrefix = true,
}: CurrencyInputProps) {
  const numericValue = Number(value) || 0;

  const [display, setDisplay] = useState(() =>
    numericValue ? amountToDisplay(numericValue) : ""
  );

  useEffect(() => {
    setDisplay((current) => {
      const currentAmount = digitsToAmount(
        current.replace(/\D/g, "")
      );

      return currentAmount === numericValue
        ? current
        : numericValue
          ? amountToDisplay(numericValue)
          : "";
    });
  }, [numericValue]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const amount = digitsToAmount(digits);

    setDisplay(digits === "" ? "" : amountToDisplay(amount));
    onChange(amount);
  }

  return (
    <div className={`relative ${wrapperClassName}`}>
      {showPrefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.85em] text-[var(--text-muted)]">
          R$
        </span>
      )}

      <input
        id={id}
        inputMode="decimal"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        onBlur={onBlur}
        className={`${showPrefix ? "pl-9" : ""} text-right ${className}`}
      />
    </div>
  );
}
