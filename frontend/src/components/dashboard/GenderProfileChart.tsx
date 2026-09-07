"use client";

/**
 * Perfil por gênero em estilo infográfico: uma linha por gênero, com
 * uma grade densa de 100 bonequinhos (10 colunas, quebra em 10
 * fileiras) representando o percentual — cada bonequinho vale 1%,
 * colorido até a marca e apagado dali pra frente — seguida do ícone
 * sólido + anel de progresso. A grade de bonequinhos ocupa a largura
 * disponível em tamanho fixo (justificada, não cresce); o anel
 * acompanha a ALTURA do card (`h-full` até um teto) — se o card
 * ficar mais alto por causa de um vizinho no mesmo grid (ex.: lista
 * de aniversariantes), o anel cresce junto. Requer que quem usa este
 * componente dê uma altura de verdade pra ele (`h-full`/`flex-1` numa
 * cadeia de flex/grid até o card) — sem isso o anel fica no tamanho
 * mínimo do conteúdo. Mesmo padrão nos dois lugares que usam (Visão
 * Geral e Gráficos de colaboradores).
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

/**
 * Ícone sólido (homem/mulher) + anel de progresso com o percentual no
 * meio. Acompanha a ALTURA da fileira (`h-full`, com `maxSize` como
 * teto) — quando o card cresce (ex.: card vizinho com mais
 * aniversariantes empurra a fileira do CSS grid pra ficar mais alta),
 * o anel cresce junto. O texto do percentual usa unidade de container
 * query (`cqh`) pra escalar com a altura real do anel sem precisar
 * medir nada em JS.
 */
function GenderRingIcon({
  gender,
  percent,
  color,
  maxSize,
}: {
  gender: "MASCULINO" | "FEMININO";
  percent: number;
  color: string;
  maxSize: number;
}) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="flex h-full shrink-0 items-center gap-1.5">
      <svg viewBox="0 0 100 140" className="h-[62%] w-auto">
        <g fill={color}>{PERSON_SILHOUETTE[gender]}</g>
      </svg>

      <div
        className="relative aspect-square h-full shrink-0"
        style={{ maxHeight: maxSize, containerType: "size" }}
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

const GRID_ICONS = 100;
const GRID_COLUMNS = 10;

function GenderRow({
  gender,
  count,
  percent,
  color,
  ringMaxSize,
  iconSize,
}: {
  gender: "MASCULINO" | "FEMININO";
  count: number;
  percent: number;
  color: string;
  ringMaxSize: number;
  iconSize: number;
}) {
  const filledCount = Math.round((percent / 100) * GRID_ICONS);

  return (
    <div className="flex min-h-0 flex-1 items-center gap-2">
      <div
        className="grid min-w-0 flex-1 gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)` }}
        title={`${count} colaborador(es)`}
      >
        {Array.from({ length: GRID_ICONS }, (_, i) => (
          <div
            key={i}
            className="justify-self-center"
            style={{ height: iconSize * 1.15, width: iconSize }}
          >
            <PictogramPerson
              gender={gender}
              color={color}
              filled={i < filledCount}
            />
          </div>
        ))}
      </div>

      <GenderRingIcon
        gender={gender}
        percent={percent}
        color={color}
        maxSize={ringMaxSize}
      />
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

  // Teto pro anel — deixa crescer com a altura da fileira (card mais
  // alto por causa de um vizinho, ex.: lista de aniversariantes), mas
  // sem passar de um tamanho que fique desproporcional.
  const ringMaxSize = compact ? 64 : 110;
  const iconSize = compact ? 8 : 13;

  return (
    <div className={`flex h-full w-full flex-col ${compact ? "gap-2" : "gap-4"}`}>
      <GenderRow
        gender="MASCULINO"
        count={masculinoCount}
        percent={masculinoPercent}
        color={GENDER_PROFILE_COLORS.MASCULINO}
        ringMaxSize={ringMaxSize}
        iconSize={iconSize}
      />
      <GenderRow
        gender="FEMININO"
        count={femininoCount}
        percent={femininoPercent}
        color={GENDER_PROFILE_COLORS.FEMININO}
        ringMaxSize={ringMaxSize}
        iconSize={iconSize}
      />
    </div>
  );
}
