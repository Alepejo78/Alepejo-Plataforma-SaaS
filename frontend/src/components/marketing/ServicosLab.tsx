"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, MousePointerClick } from "lucide-react";

import { ServicosSimulador } from "./ServicosSimulador";

/**
 * "Teste você mesmo": seção com fundo próprio (grade dourada sobre café) que
 * fica recolhida até o visitante clicar em "Clique aqui para fazer uma
 * simulação online". O link `/servicos#teste` também abre a seção.
 */
export function ServicosLab() {
  const [open, setOpen] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  const openFromHash = useCallback(() => {
    if (window.location.hash === "#teste") {
      setOpen(true);
      sectionRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  }, []);

  useEffect(() => {
    // Só no cliente, depois de montar (o hash não existe no servidor).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [openFromHash]);

  return (
    <section id="teste" ref={sectionRef} className="sv-lab scroll-mt-16 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="sv-eyebrow justify-center">Teste você mesmo</p>
          <h2 className="font-display mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
            Faça um agendamento e veja a gestão se atualizar.
          </h2>
          <p className="mt-4 leading-relaxed text-[var(--sv-cream)]/75">
            Escolha um serviço como cliente, reserve um horário e acompanhe a agenda, o caixa e o dashboard do negócio.
            É uma simulação: nada é enviado nem cobrado.
          </p>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="sv-lab-panel"
            className="sv-btn sv-btn-gold mt-8"
          >
            <MousePointerClick size={18} aria-hidden />
            {open ? "Ocultar a simulação" : "Clique aqui para fazer uma simulação online"}
            <ChevronDown size={16} aria-hidden className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {open && (
          <div
            id="sv-lab-panel"
            className="sv-lab-panel mt-14 rounded-[2rem] border border-[rgb(240_197_109/0.25)] bg-[var(--mkt-bg)] p-5 text-[var(--mkt-ink)] shadow-[0_50px_100px_-40px_rgb(0_0_0/0.7)] sm:p-9"
          >
            <ServicosSimulador />
          </div>
        )}
      </div>
    </section>
  );
}
