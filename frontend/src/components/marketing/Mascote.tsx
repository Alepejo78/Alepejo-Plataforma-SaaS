"use client";

import { systemConfig } from "@/config/system";

import "./mascote.css";

/**
 * Como o Pejo está se sentindo. Muda rosto, braços e o jeito de mexer:
 *
 * - `idle`  — parado, flutuando e piscando.
 * - `wave`  — acenando pra chamar o visitante.
 * - `point` — apontando pra tela do sistema, logo acima dele.
 * - `happy` — sorrisão, olhos fechados de contente e pulinho.
 * - `sad`   — boca pra baixo, olhar caído e ombros murchos.
 * - `spin`  — dá um giro comemorando.
 */
export type MascoteMood =
  | "idle"
  | "wave"
  | "point"
  | "happy"
  | "sad"
  | "spin";

/** Boca de cada humor — o traço que muda a cara toda do bicho. */
const MOUTHS: Record<MascoteMood, string> = {
  idle: "M86 103 Q100 112 114 103",
  wave: "M85 102 Q100 114 115 102",
  point: "M86 103 Q100 112 114 103",
  happy: "M82 99 Q100 118 118 99",
  sad: "M86 110 Q100 100 114 110",
  spin: "M82 99 Q100 118 118 99",
};

/**
 * Pejo — o mascote do AlePejo, desenhado em SVG (não é foto nem
 * imagem comprada: é vetorial, então escala sem borrar e a cor sai das
 * mesmas variáveis do sistema).
 *
 * É ele quem apresenta a demonstração guiada da página institucional:
 * acena quando chega, aponta pra tela ao começar cada módulo, fala
 * mexendo as ondinhas do peito, fica murcho quando pausam e comemora
 * no fim. Clicar nele também arranca uma reação — é o que faz parecer
 * vivo em vez de um desenho colado na página.
 *
 * A logo da empresa vai no peito de propósito: é onde ela aparece sem
 * competir com o rosto, que é pra onde o olho vai primeiro.
 */
export function Mascote({
  mood = "idle",
  speaking = false,
  size = 132,
  className = "",
  onClick,
}: {
  mood?: MascoteMood;
  /** Narração tocando — liga as ondinhas de voz no peito. */
  speaking?: boolean;
  size?: number;
  className?: string;
  onClick?: () => void;
}) {
  const isHappy = mood === "happy" || mood === "spin";
  const isSad = mood === "sad";

  // O corpo inteiro ganha o movimento do humor; o float contínuo fica
  // num grupo por dentro pra um não cancelar o transform do outro.
  const bodyAnimation =
    mood === "happy"
      ? "pejo-hop"
      : mood === "spin"
        ? "pejo-spin"
        : isSad
          ? "pejo-sad"
          : "";

  const rightArm = [
    "pejo-arm",
    mood === "wave"
      ? "pejo-arm-waving"
      : mood === "point"
        ? "pejo-arm-pointing"
        : isSad
          ? "pejo-arm-sad"
          : "",
  ]
    .filter(Boolean)
    .join(" ");

  const leftArm = ["pejo-arm", isSad ? "pejo-arm-sad" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      viewBox="0 0 200 232"
      width={size}
      height={(size / 200) * 232}
      role="img"
      aria-label={`Pejo, mascote do ${systemConfig.company.name}`}
      onClick={onClick}
      className={`pejo ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <defs>
        <linearGradient id="pejo-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#d8e1ec" />
        </linearGradient>

        <linearGradient id="pejo-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>

        <linearGradient id="pejo-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0b1220" />
        </linearGradient>

        <radialGradient id="pejo-eye" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>

        <clipPath id="pejo-badge-clip">
          <rect x="70" y="147" width="60" height="34" rx="10" />
        </clipPath>
      </defs>

      {/* sombra no chão — dá peso e tira o efeito de figurinha colada */}
      <ellipse cx="100" cy="228" rx="48" ry="6" fill="#0f172a" opacity="0.12" />

      <g className={bodyAnimation}>
        <g className={bodyAnimation ? "" : "pejo-float"}>
          {/* antena */}
          <line x1="100" y1="18" x2="100" y2="30" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <circle className="pejo-antenna" cx="100" cy="14" r="6" fill="url(#pejo-accent)" />

          {/* fones laterais */}
          <rect x="24" y="62" width="18" height="34" rx="9" fill="url(#pejo-accent)" />
          <rect x="158" y="62" width="18" height="34" rx="9" fill="url(#pejo-accent)" />

          {/* cabeça */}
          <rect x="34" y="26" width="132" height="106" rx="46" fill="url(#pejo-shell)" />
          <path
            d="M50 56 Q100 34 150 56"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* visor e rosto */}
          <rect x="52" y="60" width="96" height="56" rx="26" fill="url(#pejo-visor)" />

          {isHappy ? (
            // Contente: os olhos viram dois arquinhos, aquele "^ ^".
            <g
              fill="none"
              stroke="#7dd3fc"
              strokeWidth="5"
              strokeLinecap="round"
            >
              <path d="M68 88 Q79 74 90 88" />
              <path d="M110 88 Q121 74 132 88" />
            </g>
          ) : (
            <g className="pejo-eyes">
              <ellipse cx="79" cy={isSad ? 88 : 84} rx="14" ry={isSad ? 11 : 15} fill="url(#pejo-eye)" />
              <ellipse cx="121" cy={isSad ? 88 : 84} rx="14" ry={isSad ? 11 : 15} fill="url(#pejo-eye)" />
              <circle cx="75" cy={isSad ? 84 : 78} r="4.4" fill="#ffffff" opacity="0.9" />
              <circle cx="117" cy={isSad ? 84 : 78} r="4.4" fill="#ffffff" opacity="0.9" />
            </g>
          )}

          <path
            d={MOUTHS[mood]}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="3.4"
            strokeLinecap="round"
          />

          {/* pescoço */}
          <rect x="90" y="130" width="20" height="10" rx="4" fill="#94a3b8" />

          {/* braços — encostados no tronco, senão parecem soltos no ar */}
          <g className={leftArm}>
            <rect x="34" y="148" width="19" height="48" rx="9.5" fill="url(#pejo-shell)" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="43.5" cy="152" r="8" fill="url(#pejo-accent)" />
          </g>

          <g className={rightArm}>
            <rect x="147" y="148" width="19" height="48" rx="9.5" fill="url(#pejo-shell)" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="156.5" cy="152" r="8" fill="url(#pejo-accent)" />
          </g>

          {/* tronco */}
          <rect x="48" y="140" width="104" height="70" rx="22" fill="url(#pejo-shell)" />
          <rect x="48" y="140" width="13" height="70" rx="6.5" fill="url(#pejo-accent)" opacity="0.85" />
          <rect x="139" y="140" width="13" height="70" rx="6.5" fill="url(#pejo-accent)" opacity="0.85" />

          {/* peito: a logo da empresa */}
          <rect x="70" y="147" width="60" height="34" rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <image
            href={systemConfig.company.logo}
            x="74"
            y="151"
            width="52"
            height="26"
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#pejo-badge-clip)"
          />

          {/* ondinhas de voz — só se mexem enquanto a narração toca */}
          <g fill="url(#pejo-accent)">
            <rect
              className={speaking ? "pejo-wave" : ""}
              x="83"
              y="189"
              width="5"
              height="12"
              rx="2.5"
              opacity={speaking ? 1 : 0.35}
            />
            <rect
              className={speaking ? "pejo-wave pejo-wave-2" : ""}
              x="92"
              y="186"
              width="5"
              height="18"
              rx="2.5"
              opacity={speaking ? 1 : 0.35}
            />
            <rect
              className={speaking ? "pejo-wave pejo-wave-3" : ""}
              x="101"
              y="189"
              width="5"
              height="12"
              rx="2.5"
              opacity={speaking ? 1 : 0.35}
            />
            <rect
              className={speaking ? "pejo-wave pejo-wave-2" : ""}
              x="110"
              y="191"
              width="5"
              height="8"
              rx="2.5"
              opacity={speaking ? 1 : 0.35}
            />
          </g>

          {/* pernas e pés */}
          <rect x="76" y="208" width="16" height="10" rx="5" fill="#94a3b8" />
          <rect x="108" y="208" width="16" height="10" rx="5" fill="#94a3b8" />
          <rect x="66" y="212" width="32" height="14" rx="7" fill="url(#pejo-shell)" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="102" y="212" width="32" height="14" rx="7" fill="url(#pejo-shell)" stroke="#cbd5e1" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}
