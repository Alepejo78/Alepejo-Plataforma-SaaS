"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Banknote,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Fingerprint,
  Heart,
  History,
  LayoutDashboard,
  Link as LinkIcon,
  Package,
  Pause,
  Play,
  Plus,
  QrCode,
  Scissors,
  Search,
  ShieldCheck,
  Smartphone,
  Syringe,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChromaKeyVideo } from "./ChromaKeyVideo";
import { pickVoice, stepDuration, useSpeechVoices } from "./guided-narration";

const VIDEO_APRESENTANDO = "/videos/pejo-demo-preview.webm";
const VIDEO_IDLE = "/videos/pejo-idle.webm";

type BadgeTone = "success" | "warning" | "neutral";

const BADGE_CLASS: Record<BadgeTone, string> = {
  success: "bg-[#0d94881a] text-[#0d9488]",
  warning: "bg-[#ea580c1a] text-[#ea580c]",
  neutral: "bg-[color-mix(in_srgb,var(--mkt-muted)_16%,transparent)] text-[var(--mkt-muted)]",
};

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

/**
 * Réplica leve da tela real (sidebar + lista com badge de situação,
 * mesmo formato usado nas telas de cadastro do sistema) — não é uma
 * gravação de tela, é a própria estrutura da UI com dados de exemplo,
 * igual ao `DemoTour` de `/institucional`.
 */
type ServiceListRow = (string | { label: string; tone: BadgeTone })[];

interface DesktopStep {
  id: string;
  icon: typeof LayoutDashboard;
  label: string;
  pageTitle: string;
  subtitle: string;
  newLabel?: string;
  narration: string;
  kind: "list" | "cards" | "chart" | "vaccine";
  columns?: string[];
  rows?: ServiceListRow[];
  cards?: { label: string; value: string; sub?: string }[];
}

const DESKTOP_STEPS: DesktopStep[] = [
  {
    id: "visao-geral",
    icon: LayoutDashboard,
    label: "Visão geral",
    pageTitle: "Visão geral",
    subtitle: "O dia da empresa em um olhar só.",
    kind: "cards",
    narration:
      "A Visão Geral abre o painel com os números do dia: agendamentos, faturamento, clientes atendidos e comissões. Quem administra mais de uma unidade do grupo vê o total somado e também separado por loja.",
    cards: [
      { label: "Agendamentos hoje", value: "14", sub: "10 concluídos" },
      { label: "Faturamento do mês", value: "R$ 8.420" },
      { label: "Clientes ativos", value: "236" },
      { label: "Comissões do mês", value: "R$ 1.180" },
    ],
  },
  {
    id: "agenda",
    icon: Calendar,
    label: "Agenda",
    pageTitle: "Agenda",
    subtitle: "Dia, semana, mês ou grade — como sua equipe preferir.",
    newLabel: "Novo agendamento",
    kind: "list",
    narration:
      "Na Agenda, cada profissional tem sua coluna, com os horários livres e ocupados lado a lado. Dá pra ver por dia, semana, mês ou numa grade estilo agenda de calendário, e criar um agendamento novo com um clique no horário livre.",
    columns: ["Horário", "Cliente", "Serviço", "Profissional", "Situação"],
    rows: [
      ["09:00", "Marina Alves", "Corte + escova", "Camila Souza", { label: "Confirmado", tone: "success" }],
      ["10:30", "Rafael Nunes", "Barba desenhada", "Diego Farias", { label: "Concluído", tone: "neutral" }],
      ["14:00", "Bianca Ramos", "Manicure", "Camila Souza", { label: "Aguardando", tone: "warning" }],
    ],
  },
  {
    id: "clientes",
    icon: Heart,
    label: "Clientes",
    pageTitle: "Clientes e fidelidade",
    subtitle: "Histórico completo e pontos de quem já é cliente.",
    kind: "list",
    narration:
      "Cada cliente tem um histórico com tudo que já fez, serviços, valores e observações. E o programa de fidelidade soma pontos a cada visita, que o próprio cliente troca por desconto direto no agendamento online.",
    columns: ["Cliente", "Telefone", "Pontos", "Última visita"],
    rows: [
      ["Marina Alves", "(43) 99988-7766", "32 pts", "Hoje"],
      ["Rafael Nunes", "(43) 99877-1122", "18 pts", "28/08"],
      ["Bianca Ramos", "(43) 99655-3344", "54 pts", "25/08"],
    ],
  },
  {
    id: "pets",
    icon: Syringe,
    label: "Pets",
    pageTitle: "Carteira de vacinação",
    subtitle: "Aparece pra quem atende o segmento Pet.",
    kind: "vaccine",
    narration:
      "Pra petshops e clínicas veterinárias, cada pet ganha uma carteira de vacinação: data de aplicação, próxima dose e um selo — em dia, vence em breve ou vencida — visível assim que a ficha do cliente é aberta.",
  },
  {
    id: "produtos",
    icon: Package,
    label: "Produtos",
    pageTitle: "Produtos e estoque",
    subtitle: "Catálogo e venda avulsa, com baixa automática.",
    newLabel: "Nova venda",
    kind: "list",
    narration:
      "O módulo de produtos controla o catálogo e o estoque. Cada venda avulsa, no balcão, dá baixa na hora e já gera o título financeiro, sem precisar lançar nada duas vezes.",
    columns: ["Produto", "Categoria", "Estoque", "Preço"],
    rows: [
      ["Shampoo profissional 1L", "Cuidados", "24 un", "R$ 68,00"],
      ["Ração premium 3kg", "Pet", "6 un", "R$ 92,00"],
      ["Esmalte em gel", "Unhas", "41 un", "R$ 24,00"],
    ],
  },
  {
    id: "financeiro",
    icon: Wallet,
    label: "Financeiro",
    pageTitle: "Financeiro",
    subtitle: "Fluxo de caixa, comissão e meta, mês a mês.",
    kind: "chart",
    narration:
      "O financeiro mostra o fluxo de caixa em três visões, anual, diária e por semana do mês, sempre com o saldo acumulado. E o gráfico acompanha a meta: quanto já foi recebido contra o que foi orçado, mês a mês.",
  },
  {
    id: "config",
    icon: ShieldCheck,
    label: "Configurações",
    pageTitle: "Segurança e personalização",
    subtitle: "Quem acessa o quê, e a cara do seu negócio.",
    kind: "list",
    narration:
      "Nas configurações você cria perfis de acesso pra cada função da equipe, personaliza a logo e a cor do sistema, e liga o WhatsApp pra mandar lembrete automático de agendamento, tudo sem precisar chamar suporte.",
    columns: ["Usuário", "Perfil", "Situação"],
    rows: [
      ["Camila Souza", "Profissional", { label: "Ativo", tone: "success" }],
      ["Diego Farias", "Profissional", { label: "Ativo", tone: "success" }],
      ["Ana Lima", "Administrador", { label: "Ativo", tone: "success" }],
    ],
  },
];

const FINANCE_CHART_DATA = [
  { month: "Mar", realizado: 5200, meta: 6000 },
  { month: "Abr", realizado: 6100, meta: 6200 },
  { month: "Mai", realizado: 7300, meta: 6800 },
  { month: "Jun", realizado: 6900, meta: 7000 },
  { month: "Jul", realizado: 7950, meta: 7400 },
  { month: "Ago", realizado: 8420, meta: 8000 },
];

function chartMoney(v: number) {
  return `R$ ${Math.round(v / 100) / 10}k`;
}

function FinanceChartMock() {
  return (
    <div className="mt-4 rounded-xl border border-[var(--mkt-border)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--mkt-ink)]">Receita realizada x meta</p>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={FINANCE_CHART_DATA} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="month" stroke="var(--mkt-muted)" fontSize={12} />
            <YAxis stroke="var(--mkt-muted)" fontSize={12} tickFormatter={(v) => chartMoney(Number(v))} width={48} />
            <Tooltip
              contentStyle={{
                background: "var(--mkt-surface)",
                border: "1px solid var(--mkt-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => chartMoney(Number(v))}
            />
            <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#db2777" strokeWidth={2.5} dot={false} />
            <Line
              type="monotone"
              dataKey="meta"
              name="Meta"
              stroke="#db2777"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VaccineWalletMock() {
  const cards = [
    { name: "V10", applied: "12/06", stamp: "Aplicada", tone: "success" as BadgeTone },
    { name: "Antirrábica — próxima dose", due: "20/09", stamp: "Vence em breve", tone: "warning" as BadgeTone },
  ];

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <div key={c.name} className="relative rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-3.5">
          <div className="pointer-events-none absolute inset-2 rounded-xl border border-dashed border-[var(--mkt-border)]" />
          <span
            className={`absolute right-3 top-3 -rotate-6 rounded-full border border-transparent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BADGE_CLASS[c.tone]}`}
          >
            {c.stamp}
          </span>
          <div className="relative flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--mkt-border)] bg-[var(--mkt-surface)] text-[var(--mkt-muted)]">
              {c.applied ? <Syringe size={16} /> : <CalendarClock size={16} />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--mkt-ink)]">{c.name}</p>
              <p className="text-xs text-[var(--mkt-muted)]">
                {c.applied ? `Aplicada em ${c.applied}` : `Prevista para ${c.due}`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function KpiCardsMock({ cards }: { cards: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-3.5">
          <p className="text-xs font-medium text-[var(--mkt-muted)]">{c.label}</p>
          <p className="mt-1 text-lg font-bold text-[var(--mkt-ink)]">{c.value}</p>
          {c.sub && <p className="mt-0.5 text-[11px] text-[var(--mkt-muted)]">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function ListMock({ columns, rows }: { columns: string[]; rows: ServiceListRow[] }) {
  return (
    <>
      <div className="mt-4 flex h-9 items-center gap-2 rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] px-3 text-xs text-[var(--mkt-muted)]">
        <Search size={13} />
        Pesquisar...
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--mkt-border)]">
        <div className="min-w-[440px]">
          <div className="flex bg-[var(--mkt-bg-alt)] px-4 py-2.5 text-xs font-semibold text-[var(--mkt-muted)]">
            {columns.map((col, i) => (
              <span key={col} className={i === 0 ? "flex-1" : "w-28 shrink-0 text-right"}>
                {col}
              </span>
            ))}
          </div>
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center border-t border-[var(--mkt-border)] px-4 py-3 text-sm">
              {Array.isArray(row) ? row.map((cell, cellIndex) => (
                <span
                  key={cellIndex}
                  className={cellIndex === 0 ? "flex-1 truncate text-[var(--mkt-ink)]" : "w-28 shrink-0 text-right text-[var(--mkt-muted)]"}
                >
                  {typeof cell === "object" ? <Badge label={cell.label} tone={cell.tone} /> : cell}
                </span>
              )) : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function DesktopPreview({
  activeId,
  onSelect,
  interactive,
}: {
  activeId: string;
  onSelect?: (id: string) => void;
  interactive?: boolean;
}) {
  const step = DESKTOP_STEPS.find((s) => s.id === activeId) ?? DESKTOP_STEPS[0];

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)] shadow-lg">
      <div className="flex">
        <div className="hidden w-48 shrink-0 flex-col gap-1 border-r border-[var(--mkt-border)] p-3 md:flex">
          <div className="mb-2 flex items-center gap-2 px-2 py-1">
            <span className="vibrant-icon-badge flex h-7 w-7 items-center justify-center rounded-lg">
              <Scissors size={14} />
            </span>
            <span className="text-sm font-bold text-[var(--mkt-ink)]">AlePejo Serviços</span>
          </div>

          {DESKTOP_STEPS.map((s) => {
            const isActive = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!interactive}
                onClick={() => interactive && onSelect?.(s.id)}
                className={`flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors ${
                  isActive ? "vibrant-banner text-white" : "text-[var(--mkt-muted)] hover:bg-[var(--mkt-bg-alt)]"
                } ${interactive ? "cursor-pointer" : "cursor-default"}`}
              >
                <s.icon size={16} className="shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[var(--mkt-ink)] sm:text-xl">{step.pageTitle}</h3>
              <p className="text-sm text-[var(--mkt-muted)]">{step.subtitle}</p>
            </div>
            {step.newLabel && (
              <span className="flex items-center gap-1.5 rounded-xl vibrant-banner px-3 py-2 text-xs font-semibold text-white">
                <Plus size={13} />
                {step.newLabel}
              </span>
            )}
          </div>

          {step.kind === "cards" && step.cards && <KpiCardsMock cards={step.cards} />}
          {step.kind === "chart" && <FinanceChartMock />}
          {step.kind === "vaccine" && <VaccineWalletMock />}
          {step.kind === "list" && step.columns && step.rows && <ListMock columns={step.columns} rows={step.rows} />}
        </div>
      </div>
    </div>
  );
}

/** Moldura de celular simples — usada pelas trilhas Link público e App do profissional. */
function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[2.25rem] border-[6px] border-[var(--mkt-ink)] bg-[var(--mkt-surface)] shadow-xl">
      <div className="mx-auto mt-1.5 h-1.5 w-16 rounded-full bg-[var(--mkt-ink)] opacity-70" />
      <div className="min-h-[420px] p-4">{children}</div>
    </div>
  );
}

interface PhoneStep {
  id: string;
  icon: typeof LinkIcon;
  label: string;
  narration: string;
  screen: ReactNode;
}

const LINK_STEPS: PhoneStep[] = [
  {
    id: "escolher",
    icon: Calendar,
    label: "Escolher horário",
    narration:
      "O cliente abre o link com a cara do seu negócio, cor e ícone mudam conforme o segmento, escolhe o serviço, o profissional (ou 'qualquer um', por ordem de prioridade) e um horário livre, sem precisar ligar nem mandar mensagem.",
    screen: (
      <div className="space-y-2.5">
        <div className="vibrant-banner rounded-xl p-3 text-white">
          <p className="text-xs font-semibold opacity-90">Ateliê Bella — Salão</p>
          <p className="text-sm font-bold">Escolha o serviço</p>
        </div>
        {[
          { name: "Corte + escova", meta: "45 min · R$ 70" },
          { name: "Manicure", meta: "40 min · R$ 35" },
          { name: "Escova progressiva", meta: "90 min · R$ 180" },
        ].map((s) => (
          <div key={s.name} className="rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-2.5">
            <p className="text-sm font-semibold text-[var(--mkt-ink)]">{s.name}</p>
            <p className="text-xs text-[var(--mkt-muted)]">{s.meta}</p>
          </div>
        ))}
        <div className="flex gap-1.5">
          {["09:00", "10:30", "14:00"].map((h, i) => (
            <span
              key={h}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                i === 1 ? "vibrant-banner text-white" : "border border-[var(--mkt-border)] text-[var(--mkt-muted)]"
              }`}
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "dados",
    icon: Fingerprint,
    label: "Dados e login",
    narration:
      "Na etapa de dados, o telefone já reconhece quem é cliente e preenche nome e e-mail sozinho. Sem cadastro ainda, ele pode criar uma senha na hora, ou usar biometria, pra acompanhar tudo depois pela própria conta.",
    screen: (
      <div className="space-y-2.5">
        <p className="text-sm font-bold text-[var(--mkt-ink)]">Seus dados</p>
        <div className="rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-2.5">
          <p className="text-[11px] text-[var(--mkt-muted)]">Nome</p>
          <p className="text-sm font-medium text-[var(--mkt-ink)]">Bianca Ramos</p>
        </div>
        <div className="rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-2.5">
          <p className="text-[11px] text-[var(--mkt-muted)]">Telefone</p>
          <p className="text-sm font-medium text-[var(--mkt-ink)]">(43) 99655-3344</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--mkt-border)] p-2.5 text-[var(--mkt-accent)]">
          <Fingerprint size={16} />
          <span className="text-xs font-semibold">Entrar com biometria</span>
        </div>
      </div>
    ),
  },
  {
    id: "confirmacao",
    icon: CheckCircle2,
    label: "Confirmação",
    narration:
      "Confirmado o horário, o cliente recebe a confirmação na hora, com lembrete automático por WhatsApp mais perto da data, e pode confirmar, cancelar ou reagendar direto respondendo à mensagem.",
    screen: (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-[#0d9488]">
          <CheckCircle2 size={22} />
          <p className="text-sm font-bold">Agendamento confirmado!</p>
        </div>
        <div className="rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-3 text-sm text-[var(--mkt-ink)]">
          <p className="font-semibold">Corte + escova</p>
          <p className="text-xs text-[var(--mkt-muted)]">Qua, 10/09 às 10:30 · Camila Souza</p>
        </div>
        <div className="rounded-xl bg-[#25D3661a] p-2.5 text-xs text-[#128c53]">
          Lembrete automático: &quot;1. Confirmar · 2. Cancelar · 3. Reagendar&quot;
        </div>
      </div>
    ),
  },
  {
    id: "conta",
    icon: History,
    label: "Conta do cliente",
    narration:
      "Na própria conta, o cliente vê o histórico de atendimentos, os pontos de fidelidade acumulados e, pra quem tem pet cadastrado, a carteira de vacinação com o aviso de próxima dose, tudo sem precisar ligar pra empresa.",
    screen: (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-2.5">
          <span className="text-xs font-medium text-[var(--mkt-muted)]">Pontos de fidelidade</span>
          <span className="text-sm font-bold text-[var(--mkt-accent)]">54 pts</span>
        </div>
        <p className="text-xs font-semibold text-[var(--mkt-muted)]">Histórico</p>
        {["Manicure — 25/08", "Corte + escova — 30/07"].map((h) => (
          <div key={h} className="rounded-lg border border-[var(--mkt-border)] px-2.5 py-2 text-xs text-[var(--mkt-ink)]">
            {h}
          </div>
        ))}
        <div className="rounded-xl border border-dashed border-[var(--mkt-border)] p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--mkt-ink)]">
            <Syringe size={13} /> V10 — vence em breve
          </p>
        </div>
      </div>
    ),
  },
];

const APP_STEPS: PhoneStep[] = [
  {
    id: "agenda-dia",
    icon: Calendar,
    label: "Agenda do dia",
    narration:
      "Pelo celular, o profissional abre a própria agenda do dia, só os horários dele, sem precisar abrir o sistema inteiro pra ver o resto da equipe.",
    screen: (
      <div className="space-y-2.5">
        <p className="text-sm font-bold text-[var(--mkt-ink)]">Hoje — Camila Souza</p>
        {[
          { time: "09:00", who: "Marina Alves", tone: "success" as BadgeTone, label: "Confirmado" },
          { time: "10:30", who: "Rafael Nunes", tone: "neutral" as BadgeTone, label: "Concluído" },
          { time: "14:00", who: "Bianca Ramos", tone: "warning" as BadgeTone, label: "Aguardando" },
        ].map((a) => (
          <div key={a.time} className="flex items-center justify-between rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-2.5">
            <div>
              <p className="text-sm font-semibold text-[var(--mkt-ink)]">{a.time}</p>
              <p className="text-xs text-[var(--mkt-muted)]">{a.who}</p>
            </div>
            <Badge label={a.label} tone={a.tone} />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "checkin",
    icon: QrCode,
    label: "Check-in e conclusão",
    narration:
      "Ao chegar o cliente, um toque faz o check-in. Terminado o atendimento, concluir gera a baixa financeira e a comissão automaticamente, inclusive o Pix, quando o recebimento é configurado assim.",
    screen: (
      <div className="space-y-2.5">
        <div className="rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-3">
          <p className="text-sm font-semibold text-[var(--mkt-ink)]">Bianca Ramos — Manicure</p>
          <p className="text-xs text-[var(--mkt-muted)]">14:00 · R$ 35,00</p>
        </div>
        <span className="block rounded-xl vibrant-banner px-3 py-2 text-center text-xs font-semibold text-white">
          Concluir atendimento
        </span>
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--mkt-border)] p-2.5 text-[var(--mkt-ink)]">
          <QrCode size={22} />
          <span className="text-xs">Pix gerado automático pro profissional</span>
        </div>
      </div>
    ),
  },
  {
    id: "faturamento",
    icon: Banknote,
    label: "Faturamento e comissão",
    narration:
      "E o profissional acompanha o próprio faturamento e a comissão do dia, da semana ou do mês, direto do celular, sem depender de ninguém pra saber quanto já rendeu.",
    screen: (
      <div className="grid grid-cols-1 gap-2.5">
        {[
          { label: "Hoje", value: "R$ 105,00" },
          { label: "Esta semana", value: "R$ 640,00" },
          { label: "Comissão do mês", value: "R$ 380,00" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-3">
            <p className="text-xs text-[var(--mkt-muted)]">{k.label}</p>
            <p className="text-lg font-bold text-[var(--mkt-ink)]">{k.value}</p>
          </div>
        ))}
      </div>
    ),
  },
];

const TRACKS = [
  { id: "desktop", label: "Sistema completo", icon: LayoutDashboard },
  { id: "link", label: "Link público", icon: LinkIcon },
  { id: "app", label: "App do profissional", icon: Smartphone },
] as const;

type TrackId = (typeof TRACKS)[number]["id"];

function tourStepsFor(track: TrackId) {
  if (track === "link") return LINK_STEPS;
  if (track === "app") return APP_STEPS;
  return DESKTOP_STEPS;
}

/**
 * Demonstração guiada em três trilhas — desktop (menu a menu), link
 * público (agendamento + conta do cliente) e app do profissional —
 * montada com as próprias telas do sistema (mock fiel, dados de
 * exemplo) em vez de um vídeo gravado. A narração sai da Web Speech
 * API do navegador (pt-BR), mesmo mecanismo do `DemoTour` de
 * `/institucional` (ver `guided-narration.ts`).
 */
export function ServicosDemoTour() {
  const [track, setTrack] = useState<TrackId>("desktop");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(true);
  const [started, setStarted] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [videoMiniatura, setVideoMiniatura] = useState(VIDEO_APRESENTANDO);

  const steps = tourStepsFor(track);
  const step = steps[index] ?? steps[0];
  const voices = useSpeechVoices();
  const voice = pickVoice(voices);

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  function switchTrack(next: TrackId) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setTrack(next);
    setIndex(0);
    setPlaying(false);
    setStarted(false);
  }

  // Uma parada por vez: fala (ou conta o tempo) e avança sozinho.
  useEffect(() => {
    if (!playing) {
      return;
    }

    let cancelled = false;

    function advance() {
      if (cancelled) {
        return;
      }
      if (index < steps.length - 1) {
        setIndex(index + 1);
      } else {
        setPlaying(false);
      }
    }

    if (sound && canSpeak) {
      const utterance = new SpeechSynthesisUtterance(step.narration);

      if (voice) {
        utterance.voice = voice;
      }

      utterance.lang = "pt-BR";
      utterance.rate = 1.04;
      utterance.pitch = 1.0;
      utterance.onend = advance;
      utterance.onerror = advance;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);

      return () => {
        cancelled = true;
        window.speechSynthesis.cancel();
      };
    }

    const timer = setTimeout(advance, stepDuration(step.narration));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, sound, index, track, step.narration, canSpeak, voice]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function play() {
    setStarted(true);
    setPlaying(true);
  }

  function goTo(next: number) {
    setIndex(next);
    setStarted(true);
  }

  const finished = started && !playing && index === steps.length - 1;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mx-auto flex flex-wrap justify-center gap-2">
        {TRACKS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTrack(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              track === t.id
                ? "vibrant-banner text-white"
                : "border border-[var(--mkt-border)] text-[var(--mkt-muted)] hover:text-[var(--mkt-ink)]"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-6 flex flex-wrap justify-center gap-2">
        {steps.map((s, position) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(position)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              position === index
                ? "vibrant-banner text-white"
                : "border border-[var(--mkt-border)] text-[var(--mkt-muted)] hover:border-[var(--mkt-accent)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-6">
        {track === "desktop" ? (
          <DesktopPreview activeId={step.id} onSelect={(id) => goTo(steps.findIndex((s) => s.id === id))} interactive />
        ) : (
          <PhoneFrame>{(step as PhoneStep).screen}</PhoneFrame>
        )}

        {!started && (
          <button
            type="button"
            onClick={play}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-[rgb(43_15_28_/_0.6)] backdrop-blur-[2px] transition-colors hover:bg-[rgb(43_15_28_/_0.68)]"
          >
            <span className="vibrant-banner flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl">
              <Play size={22} className="ml-1" fill="currentColor" />
            </span>
            <span className="text-base font-semibold text-white">Assistir com o Pejo</span>
            <span className="text-xs text-white/80">
              {steps.length} etapas{canSpeak ? " · com narração" : ""}
            </span>
          </button>
        )}
      </div>

      <div className="mx-auto mt-6 rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--mkt-bg-alt)]">
            <div
              className="vibrant-banner h-full rounded-full transition-all duration-500"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-[var(--mkt-muted)]">
            {index + 1} de {steps.length}
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <div className="flex shrink-0 flex-col items-center">
            <ChromaKeyVideo
              src={videoMiniatura}
              loop={videoMiniatura === VIDEO_IDLE}
              onEnded={() => setVideoMiniatura(VIDEO_IDLE)}
              className="h-auto w-[100px] sm:w-[115px]"
            />
          </div>

          <div className="relative min-w-0 flex-1 rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-4">
            <span
              aria-hidden
              className="absolute -left-[7px] top-8 hidden h-3 w-3 rotate-45 border-b border-l border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] sm:block"
            />
            <div className="flex items-center gap-2">
              <span className="vibrant-icon-badge flex h-7 w-7 items-center justify-center rounded-lg">
                <step.icon size={15} />
              </span>
              <p className="text-sm font-semibold text-[var(--mkt-ink)]">{step.label}</p>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--mkt-muted)]">{step.narration}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--mkt-border)] pt-4">
          <button
            type="button"
            onClick={() => {
              if (finished) {
                setIndex(0);
                setPlaying(true);
                return;
              }
              if (playing) {
                setPlaying(false);
                return;
              }
              play();
            }}
            className="flex items-center gap-2 rounded-xl vibrant-banner px-4 py-2.5 text-sm font-semibold text-white"
          >
            {playing ? (
              <>
                <Pause size={16} fill="currentColor" />
                Pausar
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                {finished ? "Assistir de novo" : "Continuar"}
              </>
            )}
          </button>

          <button
            type="button"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            className="rounded-xl border border-[var(--mkt-border)] px-4 py-2.5 text-sm font-medium text-[var(--mkt-muted)] transition-colors hover:border-[var(--mkt-accent)] disabled:opacity-40"
          >
            Anterior
          </button>

          <button
            type="button"
            disabled={index === steps.length - 1}
            onClick={() => goTo(index + 1)}
            className="rounded-xl border border-[var(--mkt-border)] px-4 py-2.5 text-sm font-medium text-[var(--mkt-muted)] transition-colors hover:border-[var(--mkt-accent)] disabled:opacity-40"
          >
            Próximo
          </button>

          {canSpeak && (
            <button
              type="button"
              onClick={() => setSound(!sound)}
              className="ml-auto flex items-center gap-2 rounded-xl border border-[var(--mkt-border)] px-4 py-2.5 text-sm font-medium text-[var(--mkt-muted)] transition-colors hover:border-[var(--mkt-accent)]"
            >
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {sound ? "Som ligado" : "Som desligado"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
