"use client";

import { useState } from "react";
import { FileText, Link as LinkIcon, PlayCircle, Syringe } from "lucide-react";

import { ChromaKeyVideo } from "./ChromaKeyVideo";

const VIDEO_APRESENTANDO = "/videos/pejo-demo-preview.webm";
const VIDEO_IDLE = "/videos/pejo-idle.webm";

const ABAS = [
  {
    id: "sistema",
    label: "O sistema",
    icon: FileText,
    titulo: "Prontuário completo de cada cliente",
    narracao:
      "Cada atendimento fica registrado no histórico do cliente — serviços feitos, observações e fotos, tudo num prontuário só. Pra petshop, cada pet tem sua própria carteira de vacina: data de aplicação, próxima dose e um aviso claro quando alguma está vencida, direto na tela do profissional.",
  },
  {
    id: "link",
    label: "Link público",
    icon: LinkIcon,
    titulo: "Seu cliente agenda sozinho, no seu link",
    narracao:
      "O cliente entra no link com a cara do seu negócio, escolhe serviço, profissional e horário livre, e recebe confirmação na hora. Sem grupo de WhatsApp lotado nem ida e volta de mensagem — e ele também acompanha ali os próprios pontos de fidelidade.",
  },
] as const;

/**
 * Apresentação com vídeo do mascote + legenda escrita, no mesmo padrão
 * do "DemoTour" de /institucional — só que traduzido pros tokens
 * `--mkt-*`/tema Vibrant (o original usa os tokens globais do ERP).
 * Sem narração por voz sintetizada: aqui é só vídeo + texto abaixo.
 */
export function ServicosDemoTour() {
  const [abaAtiva, setAbaAtiva] = useState<(typeof ABAS)[number]["id"]>("sistema");
  const [video, setVideo] = useState(VIDEO_APRESENTANDO);

  const aba = ABAS.find((item) => item.id === abaAtiva) ?? ABAS[0];

  function selecionarAba(id: (typeof ABAS)[number]["id"]) {
    setAbaAtiva(id);
    setVideo(VIDEO_APRESENTANDO);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex justify-center gap-2">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selecionarAba(item.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              abaAtiva === item.id
                ? "vibrant-banner text-white"
                : "border border-[var(--mkt-border)] text-[var(--mkt-muted)] hover:text-[var(--mkt-ink)]"
            }`}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="mkt-panel mt-6 flex flex-col items-center gap-4 p-6 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center">
          <ChromaKeyVideo
            src={video}
            loop={video === VIDEO_IDLE}
            onEnded={() => setVideo(VIDEO_IDLE)}
            className="h-auto w-[120px] sm:w-[140px]"
          />
        </div>

        <div className="relative min-w-0 flex-1 rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-4">
          <span
            aria-hidden
            className="absolute -left-[7px] top-8 hidden h-3 w-3 rotate-45 border-b border-l border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] sm:block"
          />
          <div className="flex items-center gap-2">
            <span className="vibrant-icon-badge flex h-7 w-7 items-center justify-center rounded-lg">
              {aba.id === "sistema" ? <Syringe size={15} /> : <PlayCircle size={15} />}
            </span>
            <p className="text-sm font-semibold text-[var(--mkt-ink)]">{aba.titulo}</p>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--mkt-muted)]">{aba.narracao}</p>
        </div>
      </div>
    </div>
  );
}
