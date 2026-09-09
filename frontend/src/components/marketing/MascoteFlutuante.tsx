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

const VIDEO_PADRAO = "/videos/pejo-idle.webm";

/**
 * Mesmo conjunto de reações serve pros dois gatilhos (ociosidade E
 * clique) — escolhe uma ao acaso, toca uma vez, e volta sozinha pro
 * vídeo padrão quando termina (`aoTerminarReacao`).
 */
const VIDEOS_REACAO = [
  "/videos/pejo-reaction-2.webm",
  "/videos/pejo-reaction-4.webm",
];

/** Espera sem interação até o Pejo "chamar atenção" com uma reação sozinho. */
const OCIOSO_MS = 10_000;

/** Só acima disso conta como arrastar — abaixo é considerado clique (dedo/mouse tremeu um pouco). */
const LIMIAR_ARRASTO_PX = 6;

/** `w-56` do balão (224px) + uma folga — usado só pra decidir de que lado ele cabe. */
const LARGURA_BALAO_PX = 240;
/** Altura estimada do balão (texto + botão) — generosa de propósito, é só heurística de posicionamento. */
const ALTURA_BALAO_PX = 190;

interface EstadoArrasto {
  pointerId: number;
  startX: number;
  startY: number;
  origemLeft: number;
  origemTop: number;
  arrastando: boolean;
}

/**
 * Pejo fixo no canto inferior esquerdo, mas pode ser arrastado pra
 * qualquer lugar da tela (fica preso ali até recarregar a página).
 * Dois estados de vídeo:
 * - padrão: em loop, o tempo todo;
 * - reação (`VIDEOS_REACAO`, escolhida ao acaso): toca uma vez e volta
 *   pro padrão sozinha — disparada tanto por clique quanto por 10s
 *   de ociosidade (`reiniciarOcioso`), mesmo pool pros dois casos.
 */
export function MascoteFlutuante() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [video, setVideo] = useState(VIDEO_PADRAO);
  const ociosoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `null` = posição padrão (CSS bottom/left); depois do 1º arrasto
  // vira coordenada livre em pixels, sobrepondo o CSS.
  const [posicao, setPosicao] = useState<{ left: number; top: number } | null>(
    null
  );
  const raizRef = useRef<HTMLDivElement>(null);
  const arrastoRef = useRef<EstadoArrasto | null>(null);
  // Setado no fim de um arrasto de verdade — `aoClicar` confere e
  // ignora o clique nativo que o navegador dispara logo depois do
  // pointerup (senão todo arrasto também abriria o balão de fala).
  const arrastouRef = useRef(false);

  // Lado onde o balão cabe de verdade, recalculado toda vez que abre
  // (ou o robô muda de posição com ele já aberto) — sem isso, arrastar
  // o robô pro canto direito deixaria o balão sempre nascendo pra
  // direita, cortado pela borda da tela.
  const [ladoBalao, setLadoBalao] = useState<{
    horizontal: "esquerda" | "direita";
    vertical: "cima" | "baixo";
  }>({ horizontal: "direita", vertical: "cima" });

  useEffect(() => {
    if (!aberto) {
      return;
    }

    const raiz = raizRef.current;
    if (!raiz) {
      return;
    }

    const rect = raiz.getBoundingClientRect();
    const espacoDireita = window.innerWidth - rect.right;
    const espacoEsquerda = rect.left;
    const horizontal =
      espacoDireita >= LARGURA_BALAO_PX || espacoDireita >= espacoEsquerda
        ? "direita"
        : "esquerda";

    // "cima" = balão cresce pra cima a partir da base do robô (visual
    // de balão de fala clássico); só inverte se não couber (robô
    // arrastado quase no topo da tela).
    const vertical = rect.top >= ALTURA_BALAO_PX ? "cima" : "baixo";

    setLadoBalao({ horizontal, vertical });
  }, [aberto, posicao]);

  function aoPointerDown(event: React.PointerEvent) {
    const raiz = raizRef.current;
    if (!raiz) return;

    const rect = raiz.getBoundingClientRect();

    arrastoRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origemLeft: rect.left,
      origemTop: rect.top,
      arrastando: false,
    };
  }

  function aoPointerMove(event: React.PointerEvent) {
    const estado = arrastoRef.current;
    const raiz = raizRef.current;
    if (!estado || !raiz || estado.pointerId !== event.pointerId) return;

    const dx = event.clientX - estado.startX;
    const dy = event.clientY - estado.startY;

    if (!estado.arrastando) {
      if (Math.hypot(dx, dy) < LIMIAR_ARRASTO_PX) {
        return;
      }

      estado.arrastando = true;

      try {
        raiz.setPointerCapture(event.pointerId);
      } catch {
        // Sem captura o arrasto ainda funciona (só fica sujeito a
        // perder o pointer se o cursor sair muito rápido da área) —
        // não é motivo pra travar a interação.
      }
    }

    const largura = raiz.offsetWidth;
    const altura = raiz.offsetHeight;
    const maxLeft = Math.max(window.innerWidth - largura, 0);
    const maxTop = Math.max(window.innerHeight - altura, 0);

    setPosicao({
      left: Math.min(Math.max(estado.origemLeft + dx, 0), maxLeft),
      top: Math.min(Math.max(estado.origemTop + dy, 0), maxTop),
    });
  }

  function aoPointerUp(event: React.PointerEvent) {
    const estado = arrastoRef.current;
    if (estado?.pointerId !== event.pointerId) return;

    if (estado.arrastando) {
      arrastouRef.current = true;

      try {
        raizRef.current?.releasePointerCapture(event.pointerId);
      } catch {
        // Idem aoPointerDown — sem captura ativa não há o que liberar.
      }
    }

    arrastoRef.current = null;
  }

  const reiniciarOcioso = useCallback(() => {
    if (ociosoTimer.current) {
      clearTimeout(ociosoTimer.current);
    }

    ociosoTimer.current = setTimeout(() => {
      setVideo(
        VIDEOS_REACAO[Math.floor(Math.random() * VIDEOS_REACAO.length)]
      );
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
    if (arrastouRef.current) {
      // Clique nativo disparado pelo navegador logo após um arrasto —
      // não é uma intenção de abrir o balão de fala.
      arrastouRef.current = false;
      return;
    }

    setAberto(!aberto);
    const escolhido =
      VIDEOS_REACAO[Math.floor(Math.random() * VIDEOS_REACAO.length)];
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
    <div
      ref={raizRef}
      onPointerDown={aoPointerDown}
      onPointerMove={aoPointerMove}
      onPointerUp={aoPointerUp}
      onPointerCancel={aoPointerUp}
      style={
        posicao
          ? { left: posicao.left, top: posicao.top, bottom: "auto" }
          : undefined
      }
      className={`pointer-events-none fixed z-30 print:hidden ${
        posicao ? "" : "bottom-12 left-3 sm:left-5"
      }`}
    >
      <div className="relative">
        <ChromaKeyVideo
          src={video}
          loop={video === VIDEO_PADRAO}
          onEnded={aoTerminarReacao}
          onClick={aoClicar}
          className="pointer-events-auto h-[110px] w-[160px] cursor-pointer touch-none select-none object-contain drop-shadow-lg sm:h-[135px] sm:w-[195px]"
        />

        {aberto && (
          <div
            className={`pointer-events-auto absolute w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl ${
              ladoBalao.horizontal === "direita"
                ? "left-full ml-2"
                : "right-full mr-2"
            } ${
              ladoBalao.vertical === "cima" ? "bottom-0" : "top-0"
            }`}
          >
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
              Posso te mostrar o sistema funcionando, módulo por
              módulo, explicando cada um em voz alta.
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
      </div>
    </div>
  );
}
