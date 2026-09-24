"use client";

import { useState } from "react";
import Image from "next/image";

type Sistema = "erp" | "servicos";

/**
 * As telas reais dos dois sistemas, empilhadas no hero de /inicio: clicar
 * (ou usar Enter/Espaço) numa delas traz para a frente, e a outra recua.
 * Estado local, sem persistência: é um convite para explorar os dois.
 */
export function SystemsStackedCards() {
  const [frente, setFrente] = useState<Sistema>("servicos");

  return (
    <div className="in-stack" role="group" aria-label="Telas dos dois sistemas da AlePejo">
      <button
        type="button"
        onClick={() => setFrente("erp")}
        aria-pressed={frente === "erp"}
        aria-label="Trazer a tela do AlePejo ERP Cloud para a frente"
        data-front={frente === "erp"}
        className="in-shot in-shot-erp"
      >
        <span className="in-shot-tag">AlePejo ERP Cloud</span>
        <Image
          src="/marketing/erp/dashboard.webp"
          alt="Dashboard do AlePejo ERP Cloud com gráficos de colaboradores"
          width={1600}
          height={756}
          sizes="(min-width: 1024px) 30vw, 80vw"
          priority
        />
      </button>

      <button
        type="button"
        onClick={() => setFrente("servicos")}
        aria-pressed={frente === "servicos"}
        aria-label="Trazer a tela do AlePejo Serviços para a frente"
        data-front={frente === "servicos"}
        className="in-shot in-shot-srv"
      >
        <span className="in-shot-tag">AlePejo Serviços</span>
        <Image
          src="/marketing/servicos/agenda.webp"
          alt="Agenda do dia do AlePejo Serviços"
          width={1600}
          height={643}
          sizes="(min-width: 1024px) 30vw, 80vw"
          priority
        />
      </button>
    </div>
  );
}
