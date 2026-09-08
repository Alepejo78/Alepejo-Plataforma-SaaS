"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { isMarketingHomepage } from "@/lib/publicRoutes";

import { ChromaKeyVideo } from "./ChromaKeyVideo";

/**
 * Páginas em que o Pejo fica de plantão no cantinho. Só as públicas:
 * dentro do ERP a pessoa está trabalhando, e um boneco se mexendo em
 * cima da tela atrapalharia mais do que ajudaria.
 */
const PAGINAS_COM_MASCOTE = ["/institucional", "/planos", "/checkout"];

const VIDEO_PADRAO = "/videos/pejo-idle.mp4";
const VIDEOS_CLIQUE = ["/videos/pejo-click.mp4", "/videos/pejo-click2.mp4"];
const VIDEO_OCIOSO = "/videos/pejo-nudge.mp4";

/** Espera sem interação até o Pejo "chamar atenção" com uma reação sozinho. */
const OCIOSO_MS = 10_000;

/**
 * Pejo fixo no canto inferior direito, logo acima da marca "AlePejo
 * ERP Cloud" (`BrandFooter`). Três estados de vídeo:
 * - padrão: em loop, o tempo todo;
 * - ao clicar: toca uma reação aleatória uma vez e volta pro padrão;
 * - ocioso (10s sem clique): toca uma reação "chamando atenção" uma
 *   vez e volta pro padrão, repetindo enquanto ninguém interage.
 */
export function MascoteFlutuante() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [video, setVideo] = useState(VIDEO_PADRAO);
  const ociosoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reiniciarOcioso = useCallback(() => {
    if (ociosoTimer.current) {
      clearTimeout(ociosoTimer.current);
    }

    ociosoTimer.current = setTimeout(() => {
      setVideo(VIDEO_OCIOSO);
    }, OCIOSO_MS);
  }, []);

  useEffect(() => {
    reiniciarOcioso();

    return () => {
      if (ociosoTimer.current) {
        clearTimeout(ociosoTimer.current);
      }
    };
  }, [reiniciarOcioso]);

  /*
   * `isMarketingHomepage` depende do domínio, que só existe no
   * navegador — por isso a decisão sai num efeito, depois da
   * montagem, em vez de direto no corpo do componente (no servidor
   * daria resultado diferente e quebraria a hidratação).
   */
  useEffect(() => {
    const marketing =
      PAGINAS_COM_MASCOTE.some(
        (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
      ) || isMarketingHomepage(pathname, window.location.hostname);

    setVisivel(marketing);
  }, [pathname]);

  if (!visivel) {
    return null;
  }

  function aoClicar() {
    setAberto(!aberto);
    const escolhido =
      VIDEOS_CLIQUE[Math.floor(Math.random() * VIDEOS_CLIQUE.length)];
    setVideo(escolhido);
    reiniciarOcioso();
  }

  function aoTerminarReacao() {
    if (video !== VIDEO_PADRAO) {
      setVideo(VIDEO_PADRAO);
      // Volta a contar os 10s — sem isso a reação de ociosidade só
      // aconteceria uma vez na vida da página, em vez de repetir
      // enquanto ninguém interage.
      reiniciarOcioso();
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-12 right-3 z-30 flex items-end gap-2 print:hidden sm:right-5">
      {aberto && (
        <div className="pointer-events-auto relative mb-6 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar"
            className="absolute right-2 top-2 rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>

          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Oi! Eu sou o Pejo.
          </p>

          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            Posso te mostrar o sistema funcionando, módulo por módulo,
            explicando cada um em voz alta.
          </p>

          <Link
            href="/institucional#demonstracao"
            onClick={() => setAberto(false)}
            className="mt-3 block rounded-xl bg-[var(--primary)] px-3 py-2 text-center text-xs font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
          >
            Ver a demonstração
          </Link>
        </div>
      )}

      <ChromaKeyVideo
        src={video}
        loop={video === VIDEO_PADRAO}
        onEnded={aoTerminarReacao}
        onClick={aoClicar}
        className="pointer-events-auto h-[110px] w-[160px] cursor-pointer object-contain drop-shadow-lg sm:h-[135px] sm:w-[195px]"
      />
    </div>
  );
}
