"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { isMarketingHomepage } from "@/lib/publicRoutes";

import { Mascote, type MascoteMood } from "./Mascote";

/**
 * Páginas em que o Pejo fica de plantão no cantinho. Só as públicas:
 * dentro do ERP a pessoa está trabalhando, e um boneco se mexendo em
 * cima da tela atrapalharia mais do que ajudaria.
 */
const PAGINAS_COM_MASCOTE = ["/institucional", "/planos", "/checkout"];

/**
 * Pejo fixo no canto inferior direito, logo acima da marca "AlePejo
 * ERP Cloud" (`BrandFooter`) — as duas coisas juntas fecham o rodapé
 * da página sem brigar por espaço.
 *
 * Ele acena assim que a página abre, para chamar atenção, e depois
 * fica só flutuando. Clicando, abre um balão convidando pra
 * demonstração guiada, que é o papel dele: ser o anfitrião.
 */
export function MascoteFlutuante() {
  const pathname = usePathname();
  const [mood, setMood] = useState<MascoteMood>("wave");
  const [aberto, setAberto] = useState(false);
  const [visivel, setVisivel] = useState(false);

  // O aceno de boas-vindas dura pouco: mascote acenando sem parar a
  // página inteira cansa e vira ruído no canto do olho.
  useEffect(() => {
    const timer = setTimeout(() => setMood("idle"), 4000);

    return () => clearTimeout(timer);
  }, []);

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
    setMood(aberto ? "idle" : "happy");
  }

  return (
    <div className="pointer-events-none fixed bottom-12 right-3 z-30 flex items-end gap-2 print:hidden sm:right-5">
      {aberto && (
        <div className="pointer-events-auto relative mb-6 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              setMood("idle");
            }}
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

      <Mascote
        mood={mood}
        onClick={aoClicar}
        className="pointer-events-auto h-auto w-[74px] drop-shadow-lg sm:w-[92px]"
      />
    </div>
  );
}
