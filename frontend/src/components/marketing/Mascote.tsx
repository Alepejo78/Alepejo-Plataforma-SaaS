"use client";

import { systemConfig } from "@/config/system";

import "./mascote.css";

/**
 * Como o Pejo está se sentindo. Muda rosto, braços e o jeito de mexer:
 *
 * - `idle`  — flutuando, piscando e olhando em volta.
 * - `wave`  — acenando pra chamar o visitante.
 * - `point` — apontando pra tela do sistema, logo acima dele.
 * - `happy` — sorrisão, olhos fechados de contente e pulinho.
 * - `sad`   — boca pra baixo, olhar caído e ombros murchos.
 * - `spin`  — dá um giro comemorando.
 * - `side`  — parado de três-quartos, virado pro lado.
 */
export type MascoteMood =
  | "idle"
  | "wave"
  | "point"
  | "happy"
  | "sad"
  | "spin"
  | "side";

/** Boca de cada humor — o traço que muda a cara toda do bicho. */
const MOUTHS: Record<MascoteMood, string> = {
  idle: "M88 106 Q100 114 112 106",
  wave: "M87 105 Q100 116 113 105",
  point: "M88 106 Q100 114 112 106",
  happy: "M84 101 Q100 120 116 101",
  sad: "M88 113 Q100 103 112 113",
  spin: "M84 101 Q100 120 116 101",
  side: "M88 106 Q100 114 112 106",
};

/**
 * Pejo — o mascote do AlePejo.
 *
 * Desenhado do zero em SVG e de propósito diferente do robô-brinquedo
 * que virou lugar-comum: **não tem pernas**, flutua dentro de dois
 * anéis de energia e o corpo é uma cápsula, não um bonequinho. A ideia
 * é que ele seja um robô *de nuvem* — que é o que o produto é — e não
 * mais um androide branco e azul igual a tantos por aí.
 *
 * O volume vem de gradientes: luz vinda de cima, sombra na base da
 * cápsula, brilho especular no capacete e luz de contorno dourada na
 * borda direita. É o que dá a impressão de renderização 3D sem
 * depender de um modelo — SVG escala sem borrar e a cor sai das
 * variáveis do sistema.
 *
 * O dourado é da própria logo da AlePejo, e é o que separa ele
 * visualmente de qualquer robô azul genérico.
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
        : mood === "side"
          ? "pejo-lado"
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
      className={`pejo ${mood === "spin" ? "pejo-girando" : ""} ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <defs>
        {/* Casco: luz no topo, sombra embaixo — é o gradiente que faz
            a superfície parecer curva em vez de chapada. */}
        <linearGradient id="pejo-shell" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#eef2f7" />
          <stop offset="100%" stopColor="#b9c6d8" />
        </linearGradient>

        <linearGradient id="pejo-shell-dark" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#e7edf5" />
          <stop offset="100%" stopColor="#93a3b8" />
        </linearGradient>

        {/* Dourado da logo — a assinatura visual do mascote. */}
        <linearGradient id="pejo-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3d689" />
          <stop offset="45%" stopColor="#c9963a" />
          <stop offset="100%" stopColor="#8f6416" />
        </linearGradient>

        <linearGradient id="pejo-visor" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#26364f" />
          <stop offset="55%" stopColor="#111d31" />
          <stop offset="100%" stopColor="#060b14" />
        </linearGradient>

        <radialGradient id="pejo-eye" cx="42%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#e8fbff" />
          <stop offset="35%" stopColor="#7ddcf7" />
          <stop offset="75%" stopColor="#22a3e0" />
          <stop offset="100%" stopColor="#0d5f9c" />
        </radialGradient>

        {/* Brilho especular do capacete — o reflexo da "luz do estúdio". */}
        <linearGradient id="pejo-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="pejo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7ddcf7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7ddcf7" stopOpacity="0" />
        </radialGradient>

        {/* Sombra de contato e brilho suave — o que tira o aspecto
            de adesivo chapado e dá volume de render. */}
        <filter id="pejo-profundidade" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="6"
            floodColor="#0f172a"
            floodOpacity="0.22"
          />
        </filter>

        {/* Oclusão: escurece onde a cabeça encontra o corpo. */}
        <radialGradient id="pejo-oclusao" cx="50%" cy="0%" r="70%">
          <stop offset="0%" stopColor="#64748b" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
        </radialGradient>

        <clipPath id="pejo-badge-clip">
          <rect x="72" y="150" width="56" height="32" rx="10" />
        </clipPath>

        <clipPath id="pejo-capsula-clip">
          <path d="M100 136 C132 136 148 158 148 182 C148 204 128 216 100 216 C72 216 52 204 52 182 C52 158 68 136 100 136 Z" />
        </clipPath>
      </defs>

      {/* Sombra projetada: encolhe conforme ele sobe. */}
      <ellipse
        className="pejo-sombra"
        cx="100"
        cy="226"
        rx="42"
        ry="5"
        fill="#0f172a"
        opacity="0.16"
      />

      <g className={bodyAnimation}>
        <g
          className={
            bodyAnimation && mood !== "side" ? "" : "pejo-float"
          }
        >
          {/* Anel de sustentação: fica embaixo da cápsula, girando
              devagar — é o que diz "isto flutua" sem precisar de
              pernas, e a marca visual que o identifica de longe. */}
          <ellipse
            className="pejo-anel"
            cx="100"
            cy="212"
            rx="56"
            ry="13"
            fill="none"
            stroke="url(#pejo-gold)"
            strokeWidth="3"
            opacity="0.75"
          />
          <ellipse
            cx="100"
            cy="212"
            rx="44"
            ry="9"
            fill="url(#pejo-glow)"
            opacity="0.8"
          />

          {/* Antena: um nó de circuito, como as trilhas da logo. */}
          <line
            x1="100"
            y1="16"
            x2="100"
            y2="30"
            stroke="#93a3b8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle className="pejo-antenna" cx="100" cy="12" r="6.5" fill="url(#pejo-gold)" />
          <circle cx="97.6" cy="9.6" r="1.8" fill="#fff8e6" opacity="0.9" />

          {/* Cabeça: capacete com aba dourada, não uma bola lisa. */}
          <ellipse cx="100" cy="82" rx="66" ry="58" fill="url(#pejo-glow)" opacity="0.55" />
          <path
            d="M100 26 C136 26 162 50 162 84 C162 116 136 136 100 136 C64 136 38 116 38 84 C38 50 64 26 100 26 Z"
            fill="url(#pejo-shell)"
            filter="url(#pejo-profundidade)"
          />
          {/* Luz de contorno dourada na borda direita. */}
          <path
            d="M148 48 C158 60 162 72 162 84 C162 104 152 120 134 129"
            fill="none"
            stroke="url(#pejo-gold)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.75"
          />
          {/* Brilho especular. */}
          <ellipse cx="82" cy="48" rx="30" ry="13" fill="url(#pejo-gloss)" />

          {/* Fones laterais dourados. */}
          <rect x="26" y="66" width="16" height="36" rx="8" fill="url(#pejo-gold)" />
          <rect x="158" y="66" width="16" height="36" rx="8" fill="url(#pejo-gold)" />

          {/*
            Nuca: aparece só no meio do giro, quando ele fica de
            costas. É o que faz a volta parecer volta — sem isso o
            rosto reapareceria espelhado, o efeito de foto rodando.
          */}
          <g className="pejo-costas">
            <path
              d="M100 26 C136 26 162 50 162 84 C162 116 136 136 100 136 C64 136 38 116 38 84 C38 50 64 26 100 26 Z"
              fill="url(#pejo-shell-dark)"
            />
            <rect x="76" y="64" width="48" height="44" rx="12" fill="#8fa0b8" opacity="0.55" />
            <g stroke="url(#pejo-gold)" strokeWidth="3" strokeLinecap="round" opacity="0.8">
              <path d="M84 76 h32" />
              <path d="M84 86 h32" />
              <path d="M84 96 h32" />
            </g>
            <circle cx="70" cy="70" r="3" fill="#7c8ba1" />
            <circle cx="130" cy="70" r="3" fill="#7c8ba1" />
          </g>

          <g className="pejo-frente">
            {/* Visor em forma de gota — o formato que dá a "cara" dele. */}
            <path
              d="M100 52 C130 52 148 68 148 88 C148 110 126 122 100 122 C74 122 52 110 52 88 C52 68 70 52 100 52 Z"
              fill="url(#pejo-visor)"
            />
            {/* Reflexo curvo do visor: a leitura de vidro vem daqui. */}
            <path
              d="M70 64 C82 57 118 57 130 64"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.14"
            />
            <path
              d="M62 96 C70 112 92 120 108 119"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.08"
            />

          {isHappy ? (
            // Contente: os olhos viram dois arquinhos, aquele "^ ^".
            <g fill="none" stroke="#8ee6ff" strokeWidth="5" strokeLinecap="round">
              <path d="M70 90 Q81 75 92 90" />
              <path d="M108 90 Q119 75 130 90" />
            </g>
          ) : (
            <g className="pejo-eyes">
              <g className="pejo-pupilas">
                <ellipse cx="81" cy={isSad ? 92 : 88} rx="13" ry={isSad ? 10 : 14} fill="url(#pejo-eye)" />
                <ellipse cx="119" cy={isSad ? 92 : 88} rx="13" ry={isSad ? 10 : 14} fill="url(#pejo-eye)" />
                <circle cx="77.5" cy={isSad ? 88 : 83} r="4" fill="#ffffff" opacity="0.92" />
                <circle cx="115.5" cy={isSad ? 88 : 83} r="4" fill="#ffffff" opacity="0.92" />
              </g>
            </g>
          )}

            <path
              d={MOUTHS[mood]}
              fill="none"
              stroke="#8ee6ff"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
          </g>

          {/* Corpo em cápsula, sem pernas — ele nunca encosta no chão. */}
          <path
            d="M100 136 C132 136 148 158 148 182 C148 204 128 216 100 216 C72 216 52 204 52 182 C52 158 68 136 100 136 Z"
            fill="url(#pejo-shell)"
            filter="url(#pejo-profundidade)"
          />
          <g clipPath="url(#pejo-capsula-clip)">
            {/* Sombra interna na base: o que arredonda a cápsula. */}
            <ellipse cx="100" cy="228" rx="70" ry="34" fill="#8fa0b8" opacity="0.55" />
            {/* Oclusão do encontro cabeça/corpo — a sombra que a cabeça
                projeta no peito, e o detalhe que mais dá volume. */}
            <ellipse cx="100" cy="136" rx="52" ry="20" fill="url(#pejo-oclusao)" />
            <ellipse cx="72" cy="150" rx="26" ry="12" fill="#ffffff" opacity="0.55" />
          </g>
          <path
            d="M139 152 C146 162 148 172 148 182 C148 195 141 205 129 211"
            fill="none"
            stroke="url(#pejo-gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Peito: a logo da empresa, em placa dourada. */}
          <rect
            x="72"
            y="150"
            width="56"
            height="32"
            rx="10"
            fill="#ffffff"
            stroke="url(#pejo-gold)"
            strokeWidth="2"
          />
          <image
            href={systemConfig.company.logo}
            x="75"
            y="153"
            width="50"
            height="26"
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#pejo-badge-clip)"
          />

          {/* Ondinhas de voz — só se mexem enquanto a narração toca. */}
          <g fill="url(#pejo-gold)">
            <rect
              className={speaking ? "pejo-wave" : ""}
              x="84"
              y="192"
              width="5"
              height="12"
              rx="2.5"
              opacity={speaking ? 1 : 0.35}
            />
            <rect
              className={speaking ? "pejo-wave pejo-wave-2" : ""}
              x="93"
              y="189"
              width="5"
              height="18"
              rx="2.5"
              opacity={speaking ? 1 : 0.35}
            />
            <rect
              className={speaking ? "pejo-wave pejo-wave-3" : ""}
              x="102"
              y="192"
              width="5"
              height="12"
              rx="2.5"
              opacity={speaking ? 1 : 0.35}
            />
            <rect
              className={speaking ? "pejo-wave pejo-wave-2" : ""}
              x="111"
              y="194"
              width="5"
              height="8"
              rx="2.5"
              opacity={speaking ? 1 : 0.35}
            />
          </g>

          {/* Braços em cápsula, com articulação dourada no ombro —
              simples de propósito: mão desenhada em vetor neste
              tamanho vira borrão, e o gesto se lê melhor pelo braço. */}
          <g className={leftArm}>
            <circle cx="40" cy="152" r="8" fill="url(#pejo-gold)" />
            <ellipse cx="38" cy="176" rx="11" ry="20" fill="url(#pejo-shell)" />
          </g>

          <g className={rightArm}>
            <circle cx="160" cy="152" r="8" fill="url(#pejo-gold)" />
            <ellipse cx="162" cy="176" rx="11" ry="20" fill="url(#pejo-shell)" />
          </g>

        </g>
      </g>
    </svg>
  );
}
