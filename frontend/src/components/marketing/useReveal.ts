"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Revela um elemento (classe `mkt-reveal` + `data-in`) quando ele entra
 * na viewport. Usado com moderação — uma seção por vez, não card a
 * card — pra não virar o "fade-slide-up em tudo" que é o default
 * genérico de página gerada. Sem `prefers-reduced-motion`: o CSS de
 * `.mkt-reveal` já cai pra "sempre visível" nesse caso (ver
 * marketing-shared.css), então aqui não precisa checar de novo.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}
