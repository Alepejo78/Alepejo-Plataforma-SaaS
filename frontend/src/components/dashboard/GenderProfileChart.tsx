"use client";

/**
 * Perfil por gênero em estilo infográfico: grade de 100 bonequinhos
 * (cada um vale 1%) ao lado de um ícone + anel de progresso por
 * gênero — usado tanto no card compacto da Visão Geral quanto na
 * tela de Gráficos de Colaboradores.
 */

export const GENDER_PROFILE_COLORS = {
  MASCULINO: "var(--primary)",
  FEMININO: "#d6336c",
} as const;

const PERSON_SILHOUETTE = {
  MASCULINO: (
    <>
      <circle cx="50" cy="22" r="16" />
      <rect x="28" y="40" width="44" height="56" rx="10" />
      <rect x="32" y="94" width="14" height="42" rx="6" />
      <rect x="54" y="94" width="14" height="42" rx="6" />
    </>
  ),
  FEMININO: (
    <>
      <circle cx="50" cy="22" r="16" />
      <path d="M40 40 H60 L82 96 H18 Z" />
      <rect x="34" y="96" width="12" height="40" rx="5" />
      <rect x="54" y="96" width="12" height="40" rx="5" />
    </>
  ),
};

/** Ícone pequeno usado repetido na grade — mais simples que a silhueta do anel. */
function PictogramPerson({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 28" className="h-full w-full">
      <circle cx="12" cy="6" r="5" fill={color} />
      <path
        d="M12 13c-4.5 0-7.5 2.8-7.5 7v6h15v-6c0-4.2-3-7-7.5-7z"
        fill={color}
      />
    </svg>
  );
}

/** Ícone sólido (homem/mulher) + anel de progresso com o percentual no meio. */
function GenderRingIcon({
  gender,
  percent,
  color,
  size = 72,
}: {
  gender: "MASCULINO" | "FEMININO";
  percent: number;
  color: string;
  size?: number;
}) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="flex items-center gap-1.5">
      <svg viewBox="0 0 100 140" style={{ height: size * 0.62, width: size * 0.4 }}>
        <g fill={color}>{PERSON_SILHOUETTE[gender]}</g>
      </svg>

      <div className="relative" style={{ height: size, width: size }}>
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--surface-hover)" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div
          className="absolute inset-0 flex items-center justify-center text-sm font-bold"
          style={{ color }}
        >
          {Math.round(clamped)}%
        </div>
      </div>
    </div>
  );
}

export function GenderProfileChart({
  masculinoCount,
  femininoCount,
  compact = false,
}: {
  masculinoCount: number;
  femininoCount: number;
  /** Versão menor (card da Visão Geral) — grade com ícones menores e anéis reduzidos. */
  compact?: boolean;
}) {
  const total = masculinoCount + femininoCount;

  if (total === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Sem dados.</p>;
  }

  const masculinoPercent = (masculinoCount / total) * 100;
  const femininoPercent = (femininoCount / total) * 100;
  const masculinoIcons = Math.round(masculinoPercent);

  const icons = Array.from({ length: 100 }, (_, i) => ({
    key: i,
    color:
      i < masculinoIcons
        ? GENDER_PROFILE_COLORS.MASCULINO
        : GENDER_PROFILE_COLORS.FEMININO,
  }));

  return (
    <div className={`flex items-center ${compact ? "gap-3" : "gap-6"}`}>
      <div
        className="grid flex-1 grid-cols-10"
        style={{ gap: compact ? 2 : 6 }}
      >
        {icons.map((icon) => (
          <div key={icon.key} className="aspect-[24/28]">
            <PictogramPerson color={icon.color} />
          </div>
        ))}
      </div>

      <div className="flex shrink-0 flex-col gap-3">
        <GenderRingIcon
          gender="MASCULINO"
          percent={masculinoPercent}
          color={GENDER_PROFILE_COLORS.MASCULINO}
          size={compact ? 52 : 72}
        />
        <GenderRingIcon
          gender="FEMININO"
          percent={femininoPercent}
          color={GENDER_PROFILE_COLORS.FEMININO}
          size={compact ? 52 : 72}
        />
      </div>
    </div>
  );
}
