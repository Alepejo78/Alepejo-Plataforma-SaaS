"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

/** Páginas do site de marketing onde o mascote flutuante NÃO aparece
 * (ver `MascoteFlutuante.tsx`) — canto inferior esquerdo livre pra este botão. */
const PAGINAS_COM_WHATSAPP_FLUTUANTE = ["/inicio", "/servicos", "/servicos/planos"];

const WHATSAPP_LINK = "https://wa.me/5543991544557";

/**
 * Atalho fixo pro WhatsApp — só nas páginas de marketing que não têm o
 * mascote (`PAGINAS_COM_MASCOTE` em `MascoteFlutuante.tsx`), pra não
 * disputar o mesmo canto. Decisão de visibilidade sai num efeito, depois
 * da montagem, mesmo padrão do mascote (evita divergência de hidratação).
 */
export function WhatsappFloatingButton() {
  const pathname = usePathname();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    setVisivel(
      PAGINAS_COM_WHATSAPP_FLUTUANTE.some(
        (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
      )
    );
  }, [pathname]);

  if (!visivel) {
    return null;
  }

  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[color:rgb(0_0_0_/_0.25)] transition-transform hover:scale-110 active:scale-95"
    >
      <MessageCircle size={27} strokeWidth={2.2} />
    </a>
  );
}
