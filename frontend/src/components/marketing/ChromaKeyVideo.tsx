"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo com fundo transparente de verdade — os arquivos em
 * `/public/videos/*.webm` já vêm com canal alfa (VP9 dentro de WebM,
 * fundo removido por segmentação de IA, não por chroma-key de cor).
 * `object-fit`/CSS transparency não funcionam num `<video>` puro pra
 * expor esse alfa na página (o elemento sempre pinta um retângulo
 * opaco) — por isso o vídeo toca escondido e cada quadro é desenhado
 * num `<canvas>` via `drawImage`, que preserva o alfa do vídeo
 * corretamente. Sem manipulação de pixel nenhuma: a cor do robô nunca
 * é tocada, só repassada como está no arquivo.
 */
export function ChromaKeyVideo({
  src,
  className,
  onClick,
  onEnded,
  loop = true,
}: {
  src: string;
  className?: string;
  onClick?: () => void;
  onEnded?: () => void;
  loop?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    let raf = 0;
    let cancelled = false;

    // Trocar o `src` (ex.: idle -> reação de clique) não recarrega
    // sozinho em todo navegador — força carregar e tocar do zero.
    video.load();
    void video.play().catch(() => {});

    // O navegador pausa sozinho um `<video>` que nasce fora da área
    // visível da tela (economia de recursos) — como ele fica com
    // `display:none` (só o canvas aparece), o vídeo nunca "volta a
    // ficar visível" pra retomar por conta própria, e o canvas trava
    // no primeiro quadro pra sempre. Sem essa reação ao evento
    // `pause`, o robô da demonstração (mais abaixo na página, fora da
    // tela ao carregar) ficava parado, parecendo quebrado.
    function aoPausar() {
      // `video.ended` distingue as duas causas de pausa: fim natural
      // (sem loop, ex.: reação ou apresentação) não deve retomar —
      // quem trata isso é o `onEnded` de quem usa o componente.
      if (!cancelled && video && !video.ended) {
        void video.play().catch(() => {});
      }
    }

    video.addEventListener("pause", aoPausar);

    function draw() {
      if (cancelled || !video || !canvas || !ctx) {
        return;
      }

      if (video.readyState >= 2 && video.videoWidth) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      video.removeEventListener("pause", aoPausar);
    };
  }, [src]);

  return (
    // A caixa (tamanho vem do `className` do chamador) só centraliza —
    // quem preserva a proporção de verdade é o canvas em si (abaixo),
    // já que `object-fit` não é respeitado de forma confiável nesse
    // elemento; sem isso, fixar largura E altura na caixa esticava/
    // achatava o robô. Todos os vídeos em `/public/videos` são
    // normalizados pro robô ocupar a mesma fração do quadro — trocar
    // de vídeo nunca muda o tamanho aparente dele.
    <div className={`flex items-center justify-center ${className ?? ""}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop={loop}
        muted
        playsInline
        onEnded={onEnded}
        className="hidden"
      />

      <canvas
        ref={canvasRef}
        onClick={onClick}
        className={`max-h-full max-w-full ${onClick ? "cursor-pointer" : ""}`}
      />
    </div>
  );
}
