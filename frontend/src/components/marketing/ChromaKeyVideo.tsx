"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo com fundo removido de verdade — os vídeos do Pejo vêm com
 * fundo sólido (preto ou cinza-claro de estúdio), sem canal alfa.
 * `mix-blend-mode` no `<video>` NÃO funciona de forma confiável (o
 * navegador compõe vídeo numa camada própria que ignora blend mode),
 * então a remoção é feita de verdade: o vídeo toca escondido, cada
 * quadro é desenhado num `<canvas>` e os pixels próximos da cor do
 * fundo (amostrada nos 4 cantos do próprio vídeo, funciona pra fundo
 * preto ou cinza-claro sem precisar configurar por vídeo) viram
 * transparentes — o canvas já suporta alfa de verdade em qualquer
 * navegador.
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
        const feather = 48;
        const range = feather - threshold;

        for (let i = 0; i < data.length; i += 4) {
          const dr = data[i] - kr;
          const dg = data[i + 1] - kg;
          const db = data[i + 2] - kb;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);

          if (dist < threshold) {
            data[i + 3] = 0;
          } else if (dist < feather) {
            data[i + 3] = Math.round(
              ((dist - threshold) / range) * 255,
            );
          }
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
    <>
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
        className={className}
      />
    </>
  );
}
