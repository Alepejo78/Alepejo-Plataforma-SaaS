import {
  Brush,
  Car,
  Dumbbell,
  HeartPulse,
  Leaf,
  PawPrint,
  Scissors,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * Dados e regras do simulador de "Veja como funciona na prática" (/servicos).
 * Tudo fictício: estabelecimentos, profissionais, clientes e valores. As regras
 * (disponibilidade, caixa, indicadores) vêm do protótipo interativo e não
 * falam com nenhum servidor.
 */

export interface SimService {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  category: string;
}

export interface SimPro {
  id: string;
  name: string;
  role: string;
}

export interface SimCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  tone: string;
  tint: string;
  photo: string;
  business: string;
  description: string;
  services: SimService[];
  pros: SimPro[];
}

type RawCategory = Omit<SimCategory, "services" | "pros"> & {
  services: [string, number, number, string][];
  pros: [string, string][];
};

const RAW: RawCategory[] = [
  {
    id: "barbearia",
    name: "Barbearia",
    icon: Scissors,
    tone: "#916124",
    tint: "#fff0d8",
    photo: "barber",
    business: "Barbearia Estilo",
    description: "Seu estilo, nos mínimos detalhes.",
    services: [
      ["Corte masculino", 55, 40, "Do clássico ao moderno, um corte com a sua identidade."],
      ["Barba & acabamento", 40, 30, "Cuidado, alinhamento e finalização para a sua barba."],
      ["Corte + barba", 85, 60, "O cuidado completo para renovar o visual."],
    ],
    pros: [
      ["Lucas Martins", "Cortes e barba"],
      ["Rafael Costa", "Estilo e acabamento"],
    ],
  },
  {
    id: "cabelo",
    name: "Cabeleireiro",
    icon: Brush,
    tone: "#be366d",
    tint: "#fce4ee",
    photo: "hair",
    business: "Studio Essência",
    description: "Uma nova fase começa com um novo visual.",
    services: [
      ["Corte & finalização", 95, 60, "Corte personalizado com lavagem e finalização."],
      ["Escova modelada", 80, 45, "Movimento e acabamento para o seu cabelo."],
      ["Hidratação profunda", 120, 60, "Um momento de cuidado para os seus fios."],
    ],
    pros: [
      ["Camila Ferreira", "Cortes e finalização"],
      ["Juliana Alves", "Tratamentos e escova"],
    ],
  },
  {
    id: "maquiagem",
    name: "Maquiagem",
    icon: Sparkles,
    tone: "#935aa1",
    tint: "#f0e3f5",
    photo: "beauty",
    business: "Ateliê Aura",
    description: "Beleza com personalidade para cada ocasião.",
    services: [
      ["Maquiagem social", 180, 90, "Pele preparada e um look que valoriza você."],
      ["Make express", 95, 45, "Leveza e praticidade para um momento especial."],
      ["Maquiagem + penteado", 280, 120, "Uma produção completa, do início ao último detalhe."],
    ],
    pros: [
      ["Isabela Rocha", "Maquiagem e penteados"],
      ["Marina Duarte", "Beleza e produção"],
    ],
  },
  {
    id: "fisioterapia",
    name: "Fisioterapia",
    icon: HeartPulse,
    tone: "#308477",
    tint: "#def2ed",
    photo: "physio",
    business: "Movimento Fisio",
    description: "Reserve seu horário com um profissional.",
    services: [
      ["Avaliação fisioterapêutica", 160, 60, "Atendimento inicial para conhecer suas necessidades."],
      ["Sessão de fisioterapia", 140, 50, "Sessão individual com acompanhamento profissional."],
      ["Pilates individual", 110, 50, "Movimento orientado em um atendimento individual."],
    ],
    pros: [
      ["Ana Ribeiro", "Fisioterapia e movimento"],
      ["Bruno Lima", "Fisioterapia e pilates"],
    ],
  },
  {
    id: "petshop",
    name: "Pet · banho e tosa",
    icon: PawPrint,
    tone: "#8b6925",
    tint: "#fff3d4",
    photo: "pet",
    business: "Pet & Carinho",
    description: "Um dia de carinho para o seu melhor amigo.",
    services: [
      ["Banho · porte pequeno", 65, 60, "Banho e secagem para pets de até 10 kg."],
      ["Banho e tosa · pequeno", 110, 90, "Banho, secagem e tosa para pets de até 10 kg."],
      ["Banho · porte médio", 90, 75, "Cuidado completo para pets de 10 a 20 kg."],
    ],
    pros: [
      ["Bianca Souza", "Banho e tosa"],
      ["Diego Santos", "Estética animal"],
    ],
  },
  {
    id: "automotiva",
    name: "Estética automotiva",
    icon: Car,
    tone: "#5067a1",
    tint: "#e7ecff",
    photo: "car",
    business: "Brilho Auto",
    description: "Seu carro também merece esse cuidado.",
    services: [
      ["Lavagem detalhada", 95, 90, "Limpeza externa e interna para carros de passeio."],
      ["Higienização interna", 280, 180, "Cuidado detalhado com bancos e interior do veículo."],
      ["Polimento técnico", 450, 240, "Avaliação e polimento para veículos de passeio."],
    ],
    pros: [
      ["Ricardo Nunes", "Detalhamento automotivo"],
      ["Felipe Castro", "Estética e polimento"],
    ],
  },
  {
    id: "bem-estar",
    name: "Bem-estar",
    icon: Leaf,
    tone: "#658039",
    tint: "#eaf3db",
    photo: "wellness",
    business: "Espaço Leve",
    description: "Um tempo só seu, no ritmo que você precisa.",
    services: [
      ["Massagem relaxante", 130, 60, "Uma pausa de cuidado e relaxamento."],
      ["Reflexologia", 95, 45, "Um atendimento dedicado ao seu bem-estar."],
      ["Ritual de relaxamento", 190, 90, "Mais tempo para desacelerar e cuidar de você."],
    ],
    pros: [
      ["Sofia Mendes", "Massagem e bem-estar"],
      ["Fernanda Dias", "Terapias de relaxamento"],
    ],
  },
  {
    id: "personal",
    name: "Personal trainer",
    icon: Dumbbell,
    tone: "#a75637",
    tint: "#ffe6dc",
    photo: "fitness",
    business: "Pulse Personal",
    description: "Reserve um treino no seu ritmo.",
    services: [
      ["Treino individual", 90, 60, "Acompanhamento presencial durante seu treino."],
      ["Avaliação física", 120, 60, "Uma conversa e avaliação com seu profissional."],
      ["Treino em dupla", 140, 60, "Um horário para treinar com alguém. Valor para a dupla."],
    ],
    pros: [
      ["Gabriel Torres", "Treinamento individual"],
      ["Larissa Melo", "Condicionamento físico"],
    ],
  },
];

export const CATALOG: SimCategory[] = RAW.map((c) => ({
  ...c,
  services: c.services.map((s, i) => ({
    id: `${c.id}-${i}`,
    name: s[0],
    price: s[1],
    duration: s[2],
    description: s[3],
    category: c.id,
  })),
  pros: c.pros.map((p, i) => ({ id: `${c.id}-pro-${i}`, name: p[0], role: p[1] })),
}));

export const getCat = (id: string) => CATALOG.find((c) => c.id === id) ?? CATALOG[0];
export const serviceById = (id: string) => CATALOG.flatMap((c) => c.services).find((s) => s.id === id);
export const proById = (id: string) => CATALOG.flatMap((c) => c.pros).find((p) => p.id === id);

export type BookingStatus = "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  category: string;
  service: string;
  professional: string;
  date: string;
  time: string;
  customer: string;
  target: string;
  status: BookingStatus;
  paid: boolean;
  paymentMethod: string | null;
  paymentDate: string | null;
}

export interface SimState {
  version: 1;
  anchor: string;
  bookings: Booking[];
}

export const STORAGE_KEY = "alepejo-servicos-simulador-v1";

export const money = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const localDate = (s: string) => new Date(`${s}T12:00:00`);
export const dateLabel = (s: string) => localDate(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
export const fullDate = (s: string) =>
  localDate(s).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
export const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
export const timeLabel = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const initials = (n: string) =>
  n
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** Próximos 8 dias úteis (segunda a sábado), a partir de amanhã. */
export function businessDates(today: string): string[] {
  const list: string[] = [];
  const d = localDate(today);
  d.setDate(d.getDate() + 1);
  while (list.length < 8) {
    if (d.getDay() !== 0) list.push(dateKey(d));
    d.setDate(d.getDate() + 1);
  }
  return list;
}

/** Dados iniciais fictícios (mesma lógica do protótipo). */
export function seed(demoDate: string): SimState {
  const bookings: Booking[] = [];
  const names = ["Mariana Lima", "Pedro Almeida", "Juliana Dias", "Camila Azevedo"];
  CATALOG.forEach((c, ci) => {
    ["09:00", "10:15", "14:00", "16:00"].forEach((time, i) => {
      let s = c.services[i % 3];
      if (c.id === "automotiva" && i === 2) s = c.services[0];
      bookings.push({
        id: `seed-${c.id}-${i}`,
        category: c.id,
        service: s.id,
        professional: c.pros[i % 2].id,
        date: demoDate,
        time,
        customer: names[i],
        target: c.id === "petshop" ? "Mel" : c.id === "automotiva" ? "Carro de passeio" : "",
        status: i < 2 ? "completed" : "confirmed",
        paid: i < 2,
        paymentMethod: i === 0 ? "Pix" : "Cartão",
        paymentDate: i < 2 ? demoDate : null,
      });
    });
    for (let d = 1; d <= 6; d++) {
      const day = localDate(demoDate);
      day.setDate(day.getDate() - d);
      if (day.getDay() === 0) continue;
      const number = 1 + ((ci + d) % 3);
      for (let j = 0; j < number; j++) {
        const s = c.services[j % 3];
        bookings.push({
          id: `hist-${c.id}-${d}-${j}`,
          category: c.id,
          service: s.id,
          professional: c.pros[j % 2].id,
          date: dateKey(day),
          time: timeLabel(9 * 60 + j * 180),
          customer: ["Ana Costa", "Gabriel Lopes", "Paula Melo"][j],
          target: "",
          status: "completed",
          paid: true,
          paymentMethod: ["Pix", "Cartão", "Dinheiro"][j],
          paymentDate: dateKey(day),
        });
      }
    }
  });
  return { version: 1, anchor: demoDate, bookings };
}

export function isValidState(value: unknown, demoDate: string): value is SimState {
  const s = value as SimState | null;
  return (
    !!s &&
    s.version === 1 &&
    s.anchor === demoDate &&
    Array.isArray(s.bookings) &&
    s.bookings.every(
      (b) =>
        serviceById(b.service) &&
        proById(b.professional) &&
        ["confirmed", "completed", "cancelled"].includes(b.status),
    )
  );
}

/** Um horário está livre se estiver no expediente (09h–19h, seg–sáb), no futuro e sem conflito. */
export function isAvailable(
  bookings: Booking[],
  today: string,
  date: string | null,
  time: string | null,
  pro: string | null,
  service: SimService | undefined,
) {
  if (!date || !time || !pro || !service) return false;
  const start = minutes(time);
  const end = start + service.duration;
  if (start < 540 || end > 1140 || localDate(date).getDay() === 0 || date < today) return false;
  if (date === today) {
    const now = new Date();
    if (start <= now.getHours() * 60 + now.getMinutes()) return false;
  }
  return !bookings.some((b) => {
    if (b.date !== date || b.professional !== pro || b.status === "cancelled") return false;
    const other = serviceById(b.service);
    if (!other) return false;
    return start < minutes(b.time) + other.duration && end > minutes(b.time);
  });
}
