"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { Boxes, CalendarClock } from "lucide-react";

type Sistema = "erp" | "servicos";

const ERP_STATS = [
  { label: "Estoque", value: 82 },
  { label: "Financeiro", value: 64 },
  { label: "RH", value: 45 },
];

const SERVICOS_ITENS = ["09:00 · Corte masculino", "10:30 · Manicure", "14:00 · Banho e tosa"];

/**
 * Os dois cartões do hero de /inicio, empilhados — clicar num deles traz
 * pra frente (z-index + leve escala), o outro recua. Estado local só,
 * sem persistência: é um convite pra explorar os dois sistemas, não uma
 * preferência que precise sobreviver a um reload.
 */
export function SystemsStackedCards() {
  const [frente, setFrente] = useState<Sistema>("servicos");

  return (
    <div className="relative h-[320px] sm:h-[380px]">
      <button
        type="button"
        onClick={() => setFrente("erp")}
        aria-label="Trazer o cartão do AlePejo ERP Cloud pra frente"
        className="mkt-panel absolute left-0 top-2 w-[78%] -rotate-6 cursor-pointer p-5 text-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:top-6"
        style={{
          zIndex: frente === "erp" ? 2 : 1,
          transform: `rotate(-6deg) scale(${frente === "erp" ? 1.05 : 0.95})`,
          boxShadow: frente === "erp" ? "0 24px 48px -24px rgba(67,56,202,0.45)" : undefined,
        }}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mkt-surface-2)] text-[var(--mkt-accent)]">
          <Boxes size={20} />
        </span>
        <p className="font-display mt-4 font-semibold text-[var(--mkt-ink)]">AlePejo ERP Cloud</p>
        <div className="mt-4 space-y-2">
          {ERP_STATS.map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-[11px] text-[var(--mkt-muted)]">
                <span>{row.label}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--mkt-surface-2)]">
                <div
                  className="h-1.5 rounded-full bg-[linear-gradient(90deg,var(--mkt-accent),var(--mkt-accent-2))]"
                  style={{ width: `${row.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </button>

      <button
        type="button"
        onClick={() => setFrente("servicos")}
        aria-label="Trazer o cartão do AlePejo Serviços pra frente"
        className="mkt-panel absolute bottom-0 right-0 w-[74%] rotate-3 cursor-pointer p-5 text-left transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          zIndex: frente === "servicos" ? 2 : 1,
          transform: `rotate(3deg) scale(${frente === "servicos" ? 1.05 : 0.95})`,
          boxShadow: frente === "servicos" ? "0 24px 48px -24px rgba(219,39,119,0.4)" : undefined,
        }}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mkt-surface-2)] text-[var(--mkt-accent-3)]">
          <CalendarClock size={20} />
        </span>
        <p className="font-display mt-4 font-semibold text-[var(--mkt-ink)]">AlePejo Serviços — hoje</p>
        <div className="mt-4 space-y-2 text-xs" style={{ "--mkt-ticket-punch": "var(--mkt-surface)" } as CSSProperties}>
          {SERVICOS_ITENS.map((item) => (
            <div
              key={item}
              className="mkt-ticket flex items-center rounded-lg bg-[var(--mkt-surface-2)] px-3 py-2 font-medium text-[var(--mkt-ink)]"
            >
              {item}
            </div>
          ))}
        </div>
      </button>
    </div>
  );
}
