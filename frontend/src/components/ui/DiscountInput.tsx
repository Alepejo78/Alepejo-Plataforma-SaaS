"use client";

import { useEffect, useState } from "react";

import { CurrencyInput } from "./CurrencyInput";

function digitsToPercent(digits: string): number {
  if (!digits) return 0;
  return Number(digits) / 100;
}

function percentToDisplay(percent: number): string {
  return percent.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface DiscountInputProps {
  /** Valor sobre o qual o % incide (total dos itens, antes do desconto). */
  baseAmount: number;
  /** Desconto em R$ — sempre isso que é salvo, independente do modo escolhido aqui. */
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * Campo de desconto com dois modos — R$ (valor direto) ou % (sobre
 * `baseAmount`) — o usuário escolhe o que for mais fácil de
 * preencher; o que sai no `onChange` é sempre o R$ calculado, nunca
 * o percentual (não existe coluna de % no banco, é só conveniência
 * de digitação).
 */
export function DiscountInput({
  baseAmount,
  value,
  onChange,
  className = "",
}: DiscountInputProps) {
  const [mode, setMode] = useState<"currency" | "percent">("currency");

  const currentPercent = baseAmount > 0 ? (value / baseAmount) * 100 : 0;

  const [percentDisplay, setPercentDisplay] = useState(() =>
    currentPercent ? percentToDisplay(currentPercent) : ""
  );

  // Se o valor em R$ mudar por fora (ex.: item editado, formulário
  // recarregado) enquanto o campo está em modo %, reflete o novo %.
  useEffect(() => {
    if (mode !== "percent") return;

    setPercentDisplay((current) => {
      const currentDigitsPercent = digitsToPercent(
        current.replace(/\D/g, "")
      );
      const recomputed = baseAmount > 0 ? (value / baseAmount) * 100 : 0;

      return Math.abs(currentDigitsPercent - recomputed) < 0.005
        ? current
        : recomputed
          ? percentToDisplay(recomputed)
          : "";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, baseAmount, mode]);

  function handlePercentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const percent = digitsToPercent(digits);

    setPercentDisplay(digits === "" ? "" : percentToDisplay(percent));
    onChange(Math.round(baseAmount * (percent / 100) * 100) / 100);
  }

  function switchMode(next: "currency" | "percent") {
    if (next === mode) return;
    setMode(next);

    if (next === "percent") {
      const pct = baseAmount > 0 ? (value / baseAmount) * 100 : 0;
      setPercentDisplay(pct ? percentToDisplay(pct) : "");
    }
  }

  return (
    <div className="flex items-stretch gap-1.5">
      <div className="flex h-11 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] text-xs font-semibold">
        <button
          type="button"
          onClick={() => switchMode("currency")}
          className={`px-2.5 transition-colors ${
            mode === "currency"
              ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          R$
        </button>

        <button
          type="button"
          onClick={() => switchMode("percent")}
          className={`px-2.5 transition-colors ${
            mode === "percent"
              ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          %
        </button>
      </div>

      {mode === "currency" ? (
        <CurrencyInput
          wrapperClassName="flex-1"
          className={className}
          value={value}
          onChange={onChange}
        />
      ) : (
        <div className="relative flex-1">
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={percentDisplay}
            onChange={handlePercentChange}
            className={`pr-8 text-right ${className}`}
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.85em] text-[var(--text-muted)]">
            %
          </span>
        </div>
      )}
    </div>
  );
}
