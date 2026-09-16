"use client";

import type { ReactNode } from "react";

import { useReveal } from "./useReveal";
import { cn } from "@/lib/cn";

/**
 * Wrapper fino sobre `useReveal` — uma seção inteira revela de uma vez
 * ao entrar na viewport (ver marketing-shared.css `.mkt-reveal`), nunca
 * card a card. `as` fica restrito a tags nativas (nunca componente
 * customizado) pra `ref` sempre apontar pro elemento DOM de verdade.
 */
export function Reveal({
  as: Component = "div",
  className,
  id,
  children,
}: {
  as?: "div" | "section";
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  const { ref, visible } = useReveal<HTMLElement>();

  return (
    <Component
      ref={ref as never}
      id={id}
      data-in={visible}
      className={cn("mkt-reveal", className)}
    >
      {children}
    </Component>
  );
}
