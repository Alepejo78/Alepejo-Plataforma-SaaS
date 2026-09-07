"use client";

/**
 * Perfil por gênero em estilo infográfico, dividido em duas colunas:
 * à esquerda os anéis de percentual (grandes, acompanham a altura do
 * card), à direita a grade de 10 bonequinhos por gênero (2 fileiras
 * de 5, tamanho fixo, colorido até o percentual e apagado dali pra
 * frente). Mesmo padrão nos dois lugares que usam (Visão Geral e
 * Gráficos de colaboradores).
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

/** Bonequinho pequeno da grade — silhueta diferente por gênero (reto para homem, saia para mulher), igual à referência. */
function PictogramPerson({
  gender,
  color,
  filled,
}: {
  gender: "MASCULINO" | "FEMININO";
  color: string;
  filled: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 30"
      className="h-full w-full"
      style={{ opacity: filled ? 1 : 0.25 }}
    >
      <circle cx="12" cy="6" r="5" fill={color} />
      {gender === "MASCULINO" ? (
        <path
          d="M12 13c-4.5 0-7.5 2.8-7.5 7v7h15v-7c0-4.2-3-7-7.5-7z"
          fill={color}
        />
      ) : (
        <path
          d="M12 13c-1.9 0-3.5 1.2-4.1 3L4.5 25h6l.4 4h2.2l.4-4h6l-3.4-9c-.6-1.8-2.2-3-4.1-3z"
          fill={color}
        />
      )}
    </svg>
  );
}

/**
 * Anel de progresso grande com o percentual no meio — lado esquerdo
 * do card. `w-full` + `aspect-square` faz o anel acompanhar o
 * tamanho da coluna (e portanto do card), até o teto de `maxSize`.
 */
function GenderRingBig({
  gender,
  percent,
  color,
  maxSize,
  fontSizeClass,
}: {
  gender: "MASCULINO" | "FEMININO";
  percent: number;
  color: string;
  maxSize: number;
  fontSizeClass: string;
}) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="flex w-full items-center justify-center gap-2">
      <svg viewBox="0 0 100 140" className="h-[18%] w-[12%] max-h-10 min-h-5 shrink-0">
        <g fill={color}>{PERSON_SILHOUETTE[gender]}</g>
      </svg>

      <div
        className="relative aspect-square w-full"
        style={{ maxWidth: maxSize }}
      >
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
          className={`absolute inset-0 flex items-center justify-center font-bold ${fontSizeClass}`}
          style={{ color }}
        >
          {Math.round(clamped)}%
        </div>
      </div>
    </div>
  );
}

const GRID_ICONS = 10;
const GRID_COLUMNS = 5;

/** Grade de bonequinhos — tamanho fixo, não muda com o card (lado direito). */
function PictogramGrid({
  gender,
  count,
  percent,
  color,
  iconSize,
}: {
  gender: "MASCULINO" | "FEMININO";
  count: number;
  percent: number;
  color: string;
  iconSize: number;
}) {
  const filledCount = Math.round((percent / 100) * GRID_ICONS);

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, ${iconSize}px)` }}
      title={`${count} colaborador(es)`}
    >
      {Array.from({ length: GRID_ICONS }, (_, i) => (
        <div key={i} style={{ height: iconSize * 1.15, width: iconSize }}>
          <PictogramPerson
            gender={gender}
            color={color}
            filled={i < filledCount}
          />
        </div>
      ))}
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

  const iconSize = compact ? 14 : 24;
  const ringMaxSize = compact ? 64 : 120;
  const ringFontSizeClass = compact ? "text-base" : "text-3xl";

  return (
    <div className="flex w-full items-center gap-4">
      <div className={`flex flex-1 flex-col items-center justify-center ${compact ? "gap-3" : "gap-6"}`}>
        <GenderRingBig
          gender="MASCULINO"
          percent={masculinoPercent}
          color={GENDER_PROFILE_COLORS.MASCULINO}
          maxSize={ringMaxSize}
          fontSizeClass={ringFontSizeClass}
        />
        <GenderRingBig
          gender="FEMININO"
          percent={femininoPercent}
          color={GENDER_PROFILE_COLORS.FEMININO}
          maxSize={ringMaxSize}
          fontSizeClass={ringFontSizeClass}
        />
      </div>

      <div className={`flex shrink-0 flex-col justify-center ${compact ? "gap-3" : "gap-6"}`}>
        <PictogramGrid
          gender="MASCULINO"
          count={masculinoCount}
          percent={masculinoPercent}
          color={GENDER_PROFILE_COLORS.MASCULINO}
          iconSize={iconSize}
        />
        <PictogramGrid
          gender="FEMININO"
          count={femininoCount}
          percent={femininoPercent}
          color={GENDER_PROFILE_COLORS.FEMININO}
          iconSize={iconSize}
        />
      </div>
    </div>
  );
}
