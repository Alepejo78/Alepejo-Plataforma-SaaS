"use client";

/**
 * Perfil por gênero em estilo infográfico, dividido ao meio como se
 * fossem dois cards dentro de um (sem borda entre eles): do lado
 * esquerdo, a grade densa de 100 bonequinhos por gênero (10 colunas,
 * 1 bonequinho = 1%, colorido até a marca e apagado dali pra frente,
 * tamanho fixo — não cresce); do lado direito, o ícone sólido + anel
 * de progresso de cada gênero, aí sim proporcional ao tamanho da
 * própria metade (largura E altura), incluindo quando o card cresce
 * por causa de um vizinho no mesmo grid (ex.: lista de
 * aniversariantes) — usa unidade de container query (`cqh`) pro texto
 * do percentual escalar junto, sem precisar medir nada em JS. Mesmo
 * padrão nos dois lugares que usam (Visão Geral e Gráficos de
 * colaboradores).
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

/** Bonequinho pequeno da grade — silhueta diferente por gênero (reto para homem, saia para mulher). */
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
      style={{ opacity: filled ? 1 : 0.22 }}
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

const GRID_ICONS = 100;
const GRID_COLUMNS = 10;

/** Grade de bonequinhos de um gênero — tamanho fixo, ocupa a largura da metade esquerda (justificada, não cresce). */
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
      className="grid min-h-0 flex-1 content-center gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)` }}
      title={`${count} colaborador(es)`}
    >
      {Array.from({ length: GRID_ICONS }, (_, i) => (
        <div
          key={i}
          className="justify-self-center"
          style={{ height: iconSize * 1.15, width: iconSize }}
        >
          <PictogramPerson gender={gender} color={color} filled={i < filledCount} />
        </div>
      ))}
    </div>
  );
}

/**
 * Ícone sólido + anel de progresso de um gênero — ocupa a metade
 * direita, proporcional a ela (largura E altura via `aspect-square`
 * dentro de um `flex-1` que estica nos dois eixos).
 */
function GenderRing({
  gender,
  percent,
  color,
}: {
  gender: "MASCULINO" | "FEMININO";
  percent: number;
  color: string;
}) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center gap-2">
      <svg viewBox="0 0 100 140" className="h-[55%] w-auto shrink-0">
        <g fill={color}>{PERSON_SILHOUETTE[gender]}</g>
      </svg>

      <div
        className="relative aspect-square h-full max-w-full"
        style={{ containerType: "size" }}
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
          className="absolute inset-0 flex items-center justify-center font-bold"
          style={{ color, fontSize: "22cqh" }}
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
  /** Versão bem pequena (card da Visão Geral). */
  compact?: boolean;
}) {
  const total = masculinoCount + femininoCount;

  if (total === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Sem dados.</p>;
  }

  const masculinoPercent = (masculinoCount / total) * 100;
  const femininoPercent = (femininoCount / total) * 100;

  const iconSize = compact ? 8 : 13;
  const gap = compact ? "gap-2" : "gap-4";

  return (
    <div className="flex h-full w-full gap-4">
      {/* Metade esquerda: bonequinhos */}
      <div className={`flex min-w-0 flex-1 flex-col ${gap}`}>
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

      {/* Metade direita: ícone + anel, proporcional à própria metade */}
      <div className={`flex min-w-0 flex-1 flex-col ${gap}`}>
        <GenderRing
          gender="MASCULINO"
          percent={masculinoPercent}
          color={GENDER_PROFILE_COLORS.MASCULINO}
        />
        <GenderRing
          gender="FEMININO"
          percent={femininoPercent}
          color={GENDER_PROFILE_COLORS.FEMININO}
        />
      </div>
    </div>
  );
}
