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
 * pixels na cor do fundo (amostrada nos 4 cantos do próprio vídeo —
 * funciona pra fundo preto ou cinza-claro sem configurar por vídeo)
 * viram 100% transparentes; os da borda (faixa de "pena") ganham alfa
 * intermediário COM remoção de contaminação da cor do fundo (o pixel
 * observado é uma mistura do robô com o fundo — sem essa remoção, a
 * borda fica com uma auréola na cor do fundo antigo).
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
      const corners = [
        0,
        (width - 1) * 4,
        (height - 1) * width * 4,
        ((height - 1) * width + (width - 1)) * 4,
      ];

      let r = 0;
      let g = 0;
      let b = 0;

      for (const i of corners) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }

      return [r / 4, g / 4, b / 4];
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
        const threshold = 34;
        const feather = 60;
        const range = feather - threshold;

        for (let i = 0; i < data.length; i += 4) {
          const dr = data[i] - kr;
          const dg = data[i + 1] - kg;
          const db = data[i + 2] - kb;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);

          if (dist <= threshold) {
            data[i + 3] = 0;
            continue;
          }

          if (dist >= feather) {
            // Já é o robô — mantém a cor original e opacidade total.
            continue;
          }

          const alpha = (dist - threshold) / range;

          // Remove a contaminação da cor de fundo do pixel de borda
          // antes de reduzir a opacidade: o pixel observado é
          // `alpha*cor_real + (1-alpha)*cor_fundo` (mistura de estúdio),
          // então isolar `cor_real` evita a auréola que apareceria se
          // só a opacidade fosse reduzida mantendo a cor misturada.
          data[i] = clamp255((data[i] - (1 - alpha) * kr) / alpha);
          data[i + 1] = clamp255((data[i + 1] - (1 - alpha) * kg) / alpha);
          data[i + 2] = clamp255((data[i + 2] - (1 - alpha) * kb) / alpha);
          data[i + 3] = Math.round(255 * alpha);
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

function clamp255(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}
