"use client";

import { useRef, type ReactNode } from "react";

/**
 * Inclinação discreta do notebook conforme o mouse: só escreve
 * variáveis CSS no elemento (sem estado do React, sem re-render) e não
 * faz nada com `prefers-reduced-motion` ou em telas de toque.
 */
export function ServicosTilt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  function canMove() {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node || event.pointerType !== "mouse" || !canMove()) return;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--ry", `${-6 + px * 5}deg`);
    node.style.setProperty("--rx", `${2 - py * 4}deg`);
  }

  function onLeave() {
    ref.current?.style.removeProperty("--ry");
    ref.current?.style.removeProperty("--rx");
  }

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={className}>
      {children}
    </div>
  );
}
