"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo com o fundo removido de verdade (canal alfa), não pintado de
 * branco — os vídeos do Pejo vêm de estúdio, com fundo preto ou
 * cinza-claro (nunca branco de verdade, nem transparente). Pintar de
 * branco (tentativa anterior) deixa uma caixa branca visível sempre
 * que o vídeo é colocado sobre qualquer fundo que não seja branco —
 * exatamente o problema reportado.
 *
 * O vídeo toca escondido, cada quadro é desenhado num `<canvas>`: os
 * pixels na cor do fundo (amostrada em cantos do próprio vídeo —
 * funciona pra fundo preto ou cinza-claro sem configurar por vídeo)
 * viram 100% transparentes; uma faixa curta de "pena" na borda só
 * reduz a OPACIDADE, nunca mexe na cor do pixel — o robô precisa ficar
 * sólido (cor sempre igual ao vídeo original). Uma versão anterior
 * tentava também "descontaminar" a cor da borda (mistura estúdio)
 * dividindo pela opacidade — mata do robô em opacidades baixas: perto
 * de alfa=0 qualquer resíduo de cor é amplificado várias vezes e
 * estourado pro branco, dando o efeito "lavado"/fantasma reportado.
 * Sem essa divisão, a única sobra possível é uma leve franja na cor do
 * fundo do estúdio num anel fino de poucos pixels — bem menos visível
 * que o robô inteiro ficando translúcido.
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
  const keyColorRef = useRef<[number, number, number] | null>(null);

  useEffect(() => {
    keyColorRef.current = null;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      return;
    }

    // Trocar o `src` (ex.: idle -> reação de clique) não recarrega
    // sozinho em todo navegador — força carregar e tocar do zero.
    video.load();
    void video.play().catch(() => {});

    let raf = 0;
    let cancelled = false;

    function sampleKeyColor(
      width: number,
      height: number,
      data: Uint8ClampedArray,
    ): [number, number, number] {
      // Média de um bloco 5x5 em cada canto (não só 1 pixel) — reduz o
      // efeito de ruído de compressão/uma leve vinheta do estúdio na
      // cor amostrada, que faria sobrar "névoa" de fundo perto do meio
      // das bordas do quadro.
      const patch = 5;
      const startsX = [0, Math.max(0, width - patch)];
      const startsY = [0, Math.max(0, height - patch)];

      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;

      for (const sx of startsX) {
        for (const sy of startsY) {
          for (let dy = 0; dy < patch && sy + dy < height; dy++) {
            for (let dx = 0; dx < patch && sx + dx < width; dx++) {
              const i = ((sy + dy) * width + (sx + dx)) * 4;
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              n++;
            }
          }
        }
      }

      return [r / n, g / n, b / n];
    }

    function draw() {
      if (cancelled || !video || !canvas || !ctx) {
        return;
      }

      if (video.readyState >= 2 && video.videoWidth) {
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.drawImage(video, 0, 0);

        const frame = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const data = frame.data;

        if (!keyColorRef.current) {
          keyColorRef.current = sampleKeyColor(
            canvas.width,
            canvas.height,
            data,
          );
        }

        const [kr, kg, kb] = keyColorRef.current;
        // Faixa de transição curta (só 12 de distância) — o bastante
        // pra suavizar o serrilhado da borda sem alcançar pixel
        // nenhum que já seja claramente parte do robô.
        const threshold = 34;
        const feather = 46;
        const range = feather - threshold;

        for (let i = 0; i < data.length; i += 4) {
          const dr = data[i] - kr;
          const dg = data[i + 1] - kg;
          const db = data[i + 2] - kb;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);

          if (dist <= threshold) {
            data[i + 3] = 0;
          } else if (dist < feather) {
            // Só a opacidade muda — a cor do pixel NUNCA é tocada, pra
            // não "lavar"/fantasmar o robô (ver comentário do componente).
            data[i + 3] = Math.round(
              (255 * (dist - threshold)) / range,
            );
          }
          // dist >= feather: já é o robô — cor e opacidade originais, intactas.
        }

        ctx.putImageData(frame, 0, 0);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [src]);

  return (
    // A caixa (tamanho vem do `className` do chamador) só centraliza —
    // quem preserva a proporção de verdade é o canvas em si (abaixo),
    // já que `object-fit` não é respeitado de forma confiável nesse
    // elemento; sem isso, fixar largura E altura na caixa esticava/
    // achatava o robô.
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
