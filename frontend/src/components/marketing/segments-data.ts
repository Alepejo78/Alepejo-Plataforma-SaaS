import {
  Car,
  HeartPulse,
  Palette,
  PawPrint,
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

/**
 * Segmentos atendidos pelo AlePejo Serviços — mesmo conjunto de
 * `SEGMENT_OPTIONS` no repo AlePejoServiços (`config/segments.ts`),
 * copiado manualmente (repos separados, sem import cross-repo — ver
 * [[project_site_institucional_alepejo]]). Compartilhado entre
 * `/inicio` (chip de prova social na seção Sobre) e `/servicos`
 * (grade de segmentos) pra não duplicar a lista duas vezes neste repo.
 */
/** `key` casa com `segments.<key>` no dicionário `common.ts` (i18n). */
export const SERVICE_SEGMENTS: { key: string; icon: LucideIcon }[] = [
  { key: "barbearia", icon: Scissors },
  { key: "salao", icon: Sparkles },
  { key: "manicure", icon: Sparkles },
  { key: "maquiagem", icon: Palette },
  { key: "estetica", icon: Sparkles },
  { key: "bemEstar", icon: HeartPulse },
  { key: "odontologia", icon: Smile },
  { key: "clinicaEstetica", icon: Stethoscope },
  { key: "petshop", icon: PawPrint },
  { key: "esteticaAutomotiva", icon: Car },
];
