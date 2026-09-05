"use client";

/**
 * Perfil por gênero em estilo infográfico: uma linha por gênero, com
 * um bonequinho pra cada colaborador (até 100 no total — passando
 * disso, os bonequinhos passam a representar o percentual em vez da
 * contagem literal, senão vira uma parede de ícone ilegível) seguido
 * do ícone sólido + anel de progresso com o percentual.
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

/** Ícone pequeno repetido na fileira — mais simples que a silhueta do anel. */
function PictogramPerson({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 28" className="h-full w-full shrink-0">
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
  size,
}: {
  gender: "MASCULINO" | "FEMININO";
  percent: number;
  color: string;
  size: number;
}) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <svg viewBox="0 0 100 140" style={{ height: size * 0.62, width: size * 0.4 }}>
        <g fill={color}>{PERSON_SILHOUETTE[gender]}</g>
      </svg>

      <div className="relative" style={{ height: size, width: size }}>
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--surface-hover)" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div
          className="absolute inset-0 flex items-center justify-center font-bold"
          style={{ color, fontSize: size * 0.22 }}
        >
          {Math.round(clamped)}%
        </div>
      </div>
    </div>
  );
}

function GenderRow({
  gender,
  count,
  iconCount,
  percent,
  color,
  ringSize,
  iconSize,
}: {
  gender: "MASCULINO" | "FEMININO";
  count: number;
  iconCount: number;
  percent: number;
  color: string;
  ringSize: number;
  iconSize: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex max-w-full flex-wrap items-center gap-0.5"
        title={`${count} colaborador(es)`}
      >
        {Array.from({ length: iconCount }, (_, i) => (
          <div key={i} style={{ height: iconSize, width: iconSize * 0.86 }}>
            <PictogramPerson color={color} />
          </div>
        ))}
      </div>

      <GenderRingIcon gender={gender} percent={percent} color={color} size={ringSize} />
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
  /** Versão bem pequena (card da Visão Geral). */
  compact?: boolean;
}) {
  const total = masculinoCount + femininoCount;

  if (total === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Sem dados.</p>;
  }

  const masculinoPercent = (masculinoCount / total) * 100;
  const femininoPercent = (femininoCount / total) * 100;

  // Até 100 colaboradores, cada bonequinho é uma pessoa de verdade.
  // Passando disso, uma parede de ícones fica ilegível — troca pra
  // representar o percentual (100 bonequinhos no total, divididos
  // pela proporção de cada gênero).
  const masculinoIcons =
    total <= 100 ? masculinoCount : Math.round(masculinoPercent);
  const femininoIcons =
    total <= 100 ? femininoCount : Math.round(femininoPercent);

  const ringSize = compact ? 44 : 60;
  const iconSize = compact ? 12 : 16;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <GenderRow
        gender="MASCULINO"
        count={masculinoCount}
        iconCount={masculinoIcons}
        percent={masculinoPercent}
        color={GENDER_PROFILE_COLORS.MASCULINO}
        ringSize={ringSize}
        iconSize={iconSize}
      />
      <GenderRow
        gender="FEMININO"
        count={femininoCount}
        iconCount={femininoIcons}
        percent={femininoPercent}
        color={GENDER_PROFILE_COLORS.FEMININO}
        ringSize={ringSize}
        iconSize={iconSize}
      />
    </div>
  );
}
