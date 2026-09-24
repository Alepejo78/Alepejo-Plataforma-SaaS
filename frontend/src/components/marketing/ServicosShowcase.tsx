"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Vitrine do sistema: capturas reais (dados fictícios de demonstração)
 * num notebook, com abas e destaques sobre áreas reais de cada tela.
 * Coordenadas dos destaques em % da própria imagem, então acompanham
 * qualquer largura sem deformar a captura.
 */
export interface Highlight {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Slide {
  id: string;
  tab: string;
  description: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  highlights: Highlight[];
}

export const SERVICOS_SLIDES: Slide[] = [
  {
    id: "agenda",
    tab: "Agenda do dia",
    description: "Cliente, serviço, profissional e valor de cada horário, numa tela só.",
    src: "/marketing/servicos/agenda.webp",
    width: 1600,
    height: 643,
    alt: "Agenda do dia do AlePejo Serviços com quatro agendamentos confirmados",
    highlights: [
      { label: "Um agendamento por linha", x: 16, y: 43, w: 53.5, h: 51 },
      { label: "Novo agendamento", x: 58, y: 23, w: 11.8, h: 6.5 },
    ],
  },
  {
    id: "grade",
    tab: "Equipe lado a lado",
    description: "Grade com o expediente de cada profissional: clique numa hora livre para agendar.",
    src: "/marketing/servicos/grade.webp",
    width: 1400,
    height: 848,
    alt: "Agenda em grade com as colunas de dois profissionais",
    highlights: [{ label: "Uma coluna por profissional", x: 24, y: 35, w: 73, h: 6 }],
  },
  {
    id: "clientes",
    tab: "Ficha do cliente",
    description: "Ao concluir o atendimento, a ficha se atualiza: gasto, ticket médio e histórico.",
    src: "/marketing/servicos/cliente.webp",
    width: 1600,
    height: 659,
    alt: "Ficha do cliente com primeira visita, total gasto, ticket médio e prontuário",
    highlights: [{ label: "Indicadores automáticos", x: 28.7, y: 30, w: 42.7, h: 31 }],
  },
  {
    id: "pets",
    tab: "Pets",
    description: "Prontuário completo e carteira de vacinação para petshops e clínicas.",
    src: "/marketing/servicos/pets.webp",
    width: 1600,
    height: 655,
    alt: "Ficha do pet com carteira de vacinação e prontuário",
    highlights: [{ label: "Carteira de vacinação", x: 33, y: 45, w: 34, h: 16 }],
  },
  {
    id: "fidelidade",
    tab: "Fidelidade",
    description: "Pontos por real gasto, valor de resgate e saldo mínimo, definidos por você.",
    src: "/marketing/servicos/fidel.webp",
    width: 1600,
    height: 642,
    alt: "Configuração do programa de fidelidade com pontos por real gasto",
    highlights: [{ label: "Regras do programa", x: 31.5, y: 30, w: 37, h: 44 }],
  },
  {
    id: "financeiro",
    tab: "Financeiro",
    description: "Cada atendimento concluído já vira lançamento, sem digitar nada de novo.",
    src: "/marketing/servicos/fin1.webp",
    width: 1180,
    height: 450,
    alt: "Financeiro com valores em aberto, vencidos e recebidos no mês",
    highlights: [{ label: "Recebido no mês", x: 16, y: 45, w: 61, h: 14 }],
  },
  {
    id: "produtos",
    tab: "Produtos",
    description: "Estoque por produto e venda avulsa no balcão, ligada ao cliente.",
    src: "/marketing/servicos/prod1.webp",
    width: 1180,
    height: 450,
    alt: "Catálogo de produtos com preço e estoque",
    highlights: [{ label: "Estoque por produto", x: 16, y: 56, w: 61, h: 32 }],
  },
];

/** Proporção fixa do "monitor": a captura preenche e o excesso é cortado (base/lado vazio), sem deformar. */

/** Converte um destaque (em % da imagem) para % do monitor, considerando o corte do object-cover/top-left. */
function toStage(slide: Slide, h: Highlight, stageAspect: number) {
  const a = slide.width / slide.height;
  const kx = a > stageAspect ? a / stageAspect : 1;
  const ky = a < stageAspect ? stageAspect / a : 1;
  return { left: h.x * kx, top: h.y * ky, width: h.w * kx, height: h.h * ky };
}

export function ProductShowcase({
  slides = SERVICOS_SLIDES,
  stageAspect = 2.45,
  caption = "Capturas do sistema real, com dados fictícios de demonstração.",
}: {
  slides?: Slide[];
  stageAspect?: number;
  caption?: string;
}) {
  const SLIDES = slides;
  const STAGE_ASPECT = stageAspect;
  const [active, setActive] = useState(0);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-14">
      <div role="tablist" aria-label="Telas do sistema" aria-orientation="vertical" className="flex flex-col">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            id={`sv-tab-${slide.id}`}
            aria-selected={active === index}
            aria-controls="sv-stage"
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const next = (index + (event.key === "ArrowDown" ? 1 : SLIDES.length - 1)) % SLIDES.length;
                setActive(next);
                document.getElementById(`sv-tab-${SLIDES[next].id}`)?.focus();
              }
            }}
            tabIndex={active === index ? 0 : -1}
            className="sv-tab"
          >
            <span className="font-display text-lg font-semibold">{slide.tab}</span>
            <span className="sv-tab-desc text-sm leading-relaxed">
              <span>{slide.description}</span>
            </span>
          </button>
        ))}
      </div>

      <div id="sv-stage" role="tabpanel" aria-labelledby={`sv-tab-${SLIDES[active].id}`}>
        <div className="sv-laptop-screen" style={{ aspectRatio: `${STAGE_ASPECT}` }}>
          {SLIDES.map((slide, index) => (
            <div key={slide.id} className="sv-slide" data-active={active === index}>
              <div className="relative h-full w-full">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={slide.width}
                  height={slide.height}
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="h-full w-full object-cover object-left-top"
                  priority={index === 0}
                />
                {slide.highlights.map((h, i) => (
                  <span
                    key={h.label}
                    aria-hidden
                    className="sv-hl"
                    style={{
                      left: `${toStage(slide, h, STAGE_ASPECT).left}%`,
                      top: `${toStage(slide, h, STAGE_ASPECT).top}%`,
                      width: `${toStage(slide, h, STAGE_ASPECT).width}%`,
                      height: `${toStage(slide, h, STAGE_ASPECT).height}%`,
                      ["--d" as string]: i,
                    }}
                  >
                    <span className="sv-hl-tag">{h.label}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="sv-laptop-base" aria-hidden />
        <p className="mt-6 text-xs text-[var(--mkt-muted)]">
          {caption}
        </p>
      </div>
    </div>
  );
}

export function ServicosShowcase() {
  return <ProductShowcase />;
}
