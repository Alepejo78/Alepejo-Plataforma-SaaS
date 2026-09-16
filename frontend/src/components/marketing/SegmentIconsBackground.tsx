import {
  Car,
  HeartPulse,
  Palette,
  PawPrint,
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
} from "lucide-react";

/**
 * Ícones dos segmentos atendidos pelo AlePejo Serviços — mesmo conjunto
 * de `SEGMENT_OPTIONS` no repo AlePejoServiços (`config/segments.ts`),
 * com substitutos de `lucide-react` puro pros dois ícones customizados
 * de lá (Maquiagem → Palette, Odontologia → Smile), já que os SVGs
 * próprios vivem no outro repositório/deploy. Posições fixas (não
 * `Math.random()` no render) pra não gerar mismatch de hidratação entre
 * servidor e cliente.
 */
const ITEMS = [
  { Icon: Scissors, top: "6%", left: "8%", size: 44, rotate: -18, color: "#db2777" },
  { Icon: Sparkles, top: "14%", left: "82%", size: 36, rotate: 12, color: "#ea580c" },
  { Icon: Palette, top: "28%", left: "22%", size: 30, rotate: 8, color: "#0d9488" },
  { Icon: HeartPulse, top: "8%", left: "45%", size: 38, rotate: -10, color: "#d97706" },
  { Icon: Smile, top: "40%", left: "70%", size: 42, rotate: 16, color: "#db2777" },
  { Icon: Stethoscope, top: "60%", left: "10%", size: 36, rotate: -6, color: "#0d9488" },
  { Icon: PawPrint, top: "72%", left: "50%", size: 40, rotate: 10, color: "#ea580c" },
  { Icon: Car, top: "20%", left: "60%", size: 32, rotate: -14, color: "#d97706" },
  { Icon: Sparkles, top: "50%", left: "88%", size: 38, rotate: 20, color: "#db2777" },
  { Icon: Scissors, top: "85%", left: "20%", size: 34, rotate: -8, color: "#0d9488" },
  { Icon: HeartPulse, top: "90%", left: "75%", size: 28, rotate: 22, color: "#ea580c" },
  { Icon: Palette, top: "36%", left: "4%", size: 26, rotate: -20, color: "#d97706" },
  { Icon: PawPrint, top: "78%", left: "92%", size: 30, rotate: 6, color: "#db2777" },
  { Icon: Smile, top: "4%", left: "68%", size: 28, rotate: -12, color: "#0d9488" },
  { Icon: Stethoscope, top: "62%", left: "34%", size: 30, rotate: 14, color: "#ea580c" },
];

export function SegmentIconsBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {ITEMS.map((item, i) => (
        <item.Icon
          key={i}
          size={item.size}
          strokeWidth={1.5}
          style={{
            position: "absolute",
            top: item.top,
            left: item.left,
            color: item.color,
            opacity: 0.16,
            transform: `rotate(${item.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
