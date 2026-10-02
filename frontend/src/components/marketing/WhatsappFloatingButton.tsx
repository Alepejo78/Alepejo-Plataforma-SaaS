"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

/** Atalho nas páginas públicas; canto direito reservado para não sobrepor o PEJO. */
const PAGINAS_COM_WHATSAPP_FLUTUANTE = ["/inicio", "/servicos", "/servicos/planos", "/institucional"];

/** Mensagem pronta para visitantes da página institucional. */
const ROTA_INSTITUCIONAL = "/institucional";
const MENSAGEM_INSTITUCIONAL = "Olá, entrei na sua pagina e gostaria de mais informações sobre o sistema.";

const WHATSAPP_LINK = "https://wa.me/5543991544557";

/**
 * Atalho fixo pro WhatsApp no canto oposto ao mascote.
 * Decisão de visibilidade sai num efeito, depois
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

  const institucional = pathname === ROTA_INSTITUCIONAL;
  const href = institucional
    ? `${WHATSAPP_LINK}?text=${encodeURIComponent(MENSAGEM_INSTITUCIONAL)}`
    : WHATSAPP_LINK;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed z-30 flex bottom-16 right-4 h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[color:rgb(0_0_0_/_0.25)] transition-transform hover:scale-110 active:scale-95"
    >
      <MessageCircle size={27} strokeWidth={2.2} />
    </a>
  );
}
