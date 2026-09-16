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
export const SERVICE_SEGMENTS: { label: string; icon: LucideIcon }[] = [
  { label: "Barbearia", icon: Scissors },
  { label: "Salão de beleza", icon: Sparkles },
  { label: "Manicure e esmalteria", icon: Sparkles },
  { label: "Maquiagem", icon: Palette },
  { label: "Estética e depilação", icon: Sparkles },
  { label: "Bem-estar", icon: HeartPulse },
  { label: "Odontologia", icon: Smile },
  { label: "Clínica de estética", icon: Stethoscope },
  { label: "Petshop, banho e tosa", icon: PawPrint },
  { label: "Estética automotiva", icon: Car },
];
