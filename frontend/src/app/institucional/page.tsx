"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  Banknote,
  Bell,
  Boxes,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cloud,
  Factory,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  List,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Palette,
  PiggyBank,
  Plug,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  UserCog,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";

import { systemConfig } from "@/config/system";
import { contactService } from "@/services/contact.service";
import { companyOnboardingService } from "@/services/company-onboarding.service";
import { PublicNav } from "@/components/marketing/PublicNav";

/** Dias de teste grátis vigente (Administrar planos) — usado nos textos de chamada pra ação abaixo. */
function useTrialDays() {
  const [trialDays, setTrialDays] = useState(14);

  useEffect(() => {
    companyOnboardingService
      .getPublicTrialDays()
      .then(setTrialDays)
      .catch(() => {});
  }, []);

  return trialDays;
}

const financeiroChartData = [
  { month: "Mar", receita: 32100, despesa: 18400 },
  { month: "Abr", receita: 28700, despesa: 21200 },
  { month: "Mai", receita: 35900, despesa: 19800 },
  { month: "Jun", receita: 41200, despesa: 22600 },
  { month: "Jul", receita: 38500, despesa: 20100 },
  { month: "Ago", receita: 44300, despesa: 23400 },
];

function chartMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
};

type BadgeTone = "success" | "warning" | "danger" | "neutral";

const BADGE_CLASS: Record<BadgeTone, string> = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  neutral: "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
};

/**
 * Mesmos módulos/telas de verdade do sistema — nome da tela, colunas
 * da tabela e o botão de ação são iguais aos das telas reais (ver
 * `app/erp/parceiros/page.tsx`, `CrudToolbar.tsx`): cabeçalho com
 * título e botão "Novo", busca, tabela com cabeçalho fixo e badge de
 * situação. Nada de cartões de indicador — as telas reais não têm.
 */
const demoTabs = [
  {
    id: "vendas",
    icon: ShoppingCart,
    label: "Vendas",
    pageTitle: "Vendas",
    subtitle: "Orçamentos, pedidos e vendas da sua empresa.",
    newLabel: "Novo pedido",
    columns: ["Pedido", "Cliente", "Data", "Valor", "Situação"],
    rows: [
      ["#1042", "Cliente A", "12/08", "R$ 3.240,00", { label: "Faturado", tone: "success" as BadgeTone }],
      ["#1041", "Cliente B", "10/08", "R$ 1.890,00", { label: "Em aberto", tone: "warning" as BadgeTone }],
      ["#1040", "Cliente C", "08/08", "R$ 970,00", { label: "Faturado", tone: "success" as BadgeTone }],
    ],
  },
  {
    id: "financeiro",
    icon: Banknote,
    label: "Financeiro",
    pageTitle: "Contas a pagar e a receber",
    subtitle: "Lançamentos financeiros da sua empresa.",
    newLabel: "Novo lançamento",
    columns: ["Descrição", "Vencimento", "Valor", "Situação"],
    rows: [
      ["Recebimento — Cliente A", "22/08", "R$ 2.100,00", { label: "A vencer", tone: "warning" as BadgeTone }],
      ["Pagamento — Fornecedor B", "24/08", "R$ 3.400,00", { label: "A vencer", tone: "warning" as BadgeTone }],
      ["Recebimento — Cliente C", "10/08", "R$ 1.560,00", { label: "Pago", tone: "success" as BadgeTone }],
    ],
    hasDashboard: true,
  },
  {
    id: "estoque",
    icon: Boxes,
    label: "Estoque",
    pageTitle: "Estoque",
    subtitle: "Saldo por depósito, sempre atualizado.",
    newLabel: "Nova movimentação",
    columns: ["Produto", "Depósito", "Saldo", "Situação"],
    rows: [
      ["Produto A", "Depósito Central", "420 un", { label: "OK", tone: "success" as BadgeTone }],
      ["Produto B", "Depósito Central", "8 un", { label: "Abaixo do mínimo", tone: "danger" as BadgeTone }],
      ["Produto C", "Filial Norte", "132 un", { label: "OK", tone: "success" as BadgeTone }],
    ],
  },
  {
    id: "rh",
    icon: UserCog,
    label: "Recursos Humanos",
    pageTitle: "Colaboradores",
    subtitle: "Cadastro e situação de cada colaborador.",
    newLabel: "Novo colaborador",
    columns: ["Colaborador", "Cargo", "Situação"],
    rows: [
      ["Colaborador A", "Vendedor", { label: "Ativo", tone: "success" as BadgeTone }],
      ["Colaborador B", "Analista Financeiro", { label: "Férias", tone: "neutral" as BadgeTone }],
      ["Colaborador C", "Auxiliar de Estoque", { label: "Experiência", tone: "warning" as BadgeTone }],
    ],
  },
];

/**
 * Réplica fiel da tela real: sidebar com ícone + nome do módulo
 * (Sidebar.styles.ts) e o conteúdo no mesmo formato de lista das
 * telas de cadastro (cabeçalho + botão "Novo" + busca + tabela com
 * badge de situação, ver `app/erp/parceiros/page.tsx`). Sem cartões
 * de indicador — as telas de cadastro do sistema não têm.
 */
function FinanceiroDashboard() {
  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Receita x despesa por mês
      </p>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={financeiroChartData}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="var(--text-muted)"
              fontSize={12}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={12}
              tickFormatter={(v) => chartMoney(Number(v))}
              width={72}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              cursor={{ fill: "var(--surface-hover)" }}
              formatter={(v) => chartMoney(Number(v))}
            />
            <Bar
              dataKey="receita"
              name="Receita"
              fill="var(--success)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="despesa"
              name="Despesa"
              fill="var(--danger)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Réplica fiel da tela real: sidebar com ícone + nome do módulo
 * (Sidebar.styles.ts) e o conteúdo no mesmo formato de lista das
 * telas de cadastro (cabeçalho + botão "Novo" + busca + tabela com
 * badge de situação, ver `app/erp/parceiros/page.tsx`). Financeiro
 * também tem o sub-menu Dashboard, com o mesmo gráfico (recharts) da
 * tela real (`app/erp/financeiro/graficos-fluxo-caixa/page.tsx`).
 */
function AppPreview({
  activeId,
  onSelect,
  interactive,
}: {
  activeId: string;
  onSelect?: (id: string) => void;
  interactive?: boolean;
}) {
  const [view, setView] = useState<"list" | "dashboard">("list");
  const tab = demoTabs.find((t) => t.id === activeId) ?? demoTabs[0];

  function selectModule(id: string) {
    setView("list");
    onSelect?.(id);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
      <div className="flex">
        <div className="hidden w-52 shrink-0 flex-col gap-1 border-r border-[var(--border)] p-3 md:flex">
          <div className="mb-2 flex items-center gap-2 px-2 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={systemConfig.company.logo}
              alt={systemConfig.company.name}
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-contain"
            />
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {systemConfig.company.name}
            </span>
          </div>

          {demoTabs.map((mod) => {
            const isActive = mod.id === activeId;

            return (
              <button
                key={mod.id}
                type="button"
                disabled={!interactive}
                onClick={() => interactive && selectModule(mod.id)}
                className={`flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                } ${interactive ? "cursor-pointer" : "cursor-default"}`}
              >
                <mod.icon size={17} className="shrink-0" />
                <span className="truncate">{mod.label}</span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                {tab.pageTitle}
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {tab.subtitle}
              </p>
            </div>

            <span className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-contrast)]">
              <Plus size={13} />
              {tab.newLabel}
            </span>
          </div>

          {tab.hasDashboard && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => interactive && setView("list")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === "list"
                    ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                    : "border border-[var(--border)] text-[var(--text-secondary)]"
                }`}
              >
                <List size={13} />
                Lançamentos
              </button>

              <button
                type="button"
                onClick={() => interactive && setView("dashboard")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === "dashboard"
                    ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                    : "border border-[var(--border)] text-[var(--text-secondary)]"
                }`}
              >
                <LayoutDashboard size={13} />
                Dashboard
              </button>
            </div>
          )}

          {tab.hasDashboard && view === "dashboard" ? (
            <FinanceiroDashboard />
          ) : (
            <>
              <div className="mt-4 flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--text-muted)]">
                <Search size={13} />
                Pesquisar...
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
                <div className="min-w-[480px]">
                  <div className="flex bg-[var(--surface-hover)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">
                    {tab.columns.map((col, i) => (
                      <span
                        key={col}
                        className={i === 0 ? "flex-1" : "w-28 shrink-0 text-right"}
                      >
                        {col}
                      </span>
                    ))}
                  </div>

                  {tab.rows.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="flex items-center border-t border-[var(--border)] px-4 py-3 text-sm"
                    >
                      {row.map((cell, cellIndex) => {
                        const isFirst = cellIndex === 0;

                        if (typeof cell === "object") {
                          return (
                            <span
                              key={cellIndex}
                              className={`w-28 shrink-0 text-right`}
                            >
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE_CLASS[cell.tone]}`}
                              >
                                {cell.label}
                              </span>
                            </span>
                          );
                        }

                        return (
                          <span
                            key={cellIndex}
                            className={`truncate ${
                              isFirst
                                ? "flex-1 font-medium text-[var(--text-primary)]"
                                : "w-28 shrink-0 text-right text-[var(--text-secondary)]"
                            }`}
                          >
                            {cell}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const dashboardSidebarGroups = [
  { label: "Cadastros", icon: Users },
  { label: "Colaboradores", icon: UserCog },
  { label: "Compras", icon: Truck },
  { label: "Comercial", icon: ShoppingCart },
  { label: "Estoque", icon: Boxes },
  { label: "Financeiro", icon: Banknote },
  { label: "Produção", icon: Factory },
];

const dashboardStatCards = [
  { label: "Parceiros", value: "128", icon: Users },
  { label: "Produtos", value: "312", icon: Package },
  { label: "Itens em estoque", value: "1.284", icon: Boxes },
  { label: "Colaboradores", value: "47", icon: UserCog },
];

/**
 * Réplica da tela real de abertura do sistema (Visão geral,
 * `app/page.tsx`) — barra superior, sidebar com os módulos e os
 * cartões/painéis do painel inicial, não um recorte de uma tela
 * interna. É a primeira imagem que quem visita o site vê do produto.
 */
function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={systemConfig.company.logo}
            alt={systemConfig.company.name}
            width={22}
            height={22}
            className="h-[22px] w-[22px] object-contain"
          />
          <div className="leading-tight">
            <p className="text-xs font-bold text-[var(--text-primary)]">
              {systemConfig.company.name}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {systemConfig.systemName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <LayoutGrid size={14} />
          <Bell size={14} />
          <Moon size={14} />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[10px] font-semibold">
            {systemConfig.company.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex">
        <div className="hidden w-40 shrink-0 flex-col gap-0.5 border-r border-[var(--border)] p-2.5 md:flex">
          <div className="flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-2.5 text-xs font-medium text-[var(--primary-contrast)]">
            <LayoutDashboard size={14} className="shrink-0" />
            Visão geral
          </div>

          {dashboardSidebarGroups.map((group) => (
            <div
              key={group.label}
              className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs text-[var(--text-secondary)]"
            >
              <group.icon size={13} className="shrink-0" />
              <span className="truncate">{group.label}</span>
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <p className="text-base font-bold text-[var(--text-primary)]">
            Bom dia 👋
          </p>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Bem-vindo ao {systemConfig.company.name} {systemConfig.systemName}
            .
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {dashboardStatCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-[var(--border)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {card.label}
                  </p>
                  <card.icon size={14} className="text-[var(--text-muted)]" />
                </div>
                <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Wallet size={13} className="text-[var(--text-secondary)]" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  A pagar/receber
                </p>
              </div>

              {[
                { label: "A receber", value: "R$ 41.200" },
                { label: "A pagar", value: "R$ 18.750" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-t border-[var(--border)] py-1.5 text-[11px]"
                >
                  <span className="text-[var(--text-muted)]">
                    {row.label}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <PiggyBank
                  size={13}
                  className="text-[var(--text-secondary)]"
                />
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Fluxo de caixa
                </p>
              </div>

              {[
                { label: "Recebido", value: "R$ 38.500" },
                { label: "Pago", value: "R$ 20.100" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-t border-[var(--border)] py-1.5 text-[11px]"
                >
                  <span className="text-[var(--text-muted)]">
                    {row.label}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const trialDays = useTrialDays();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-96 bg-[radial-gradient(60%_60%_at_50%_0%,var(--primary)_0%,transparent_70%)] opacity-[0.12]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <Sparkles size={12} className="text-[var(--primary)]" />
            Feito para pequenas empresas
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-[var(--text-primary)] md:text-5xl">
            Sua empresa organizada,{" "}
            <span className="text-[var(--primary)]">num só sistema</span>
          </h1>

          <p className="mt-5 max-w-lg text-lg text-[var(--text-muted)]">
            Cadastros, vendas, compras, estoque, financeiro, produção e RH —
            tudo integrado, na nuvem. Comece em minutos, com {trialDays} dia
            {trialDays === 1 ? "" : "s"} grátis.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/planos"
              className="rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
            >
              Começar teste grátis de {trialDays} dia
              {trialDays === 1 ? "" : "s"}
            </Link>

            <a
              href="#demonstracao"
              className="rounded-xl border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            >
              Ver demonstração
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[var(--success)]" />
              Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[var(--success)]" />
              Suporte em português
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[var(--success)]" />
              Implantação assistida
            </span>
          </div>
        </div>

        <div className="lg:pl-4">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

const spotlightFeatures = [
  {
    icon: Workflow,
    title: "Um fluxo só, do pedido ao caixa",
    description:
      "Venda gera saída de estoque, gera conta a receber — sem digitar a mesma informação três vezes em telas diferentes.",
  },
  {
    icon: Layers,
    title: "Cresce junto com sua empresa",
    description:
      "Comece só com o essencial e adicione Produção, RH ou Folha de Pagamento quando precisar, sem trocar de sistema.",
  },
];

/** Um card por módulo, com a lista de telas/recursos de verdade dele — igual ao que existe no sistema. */
const moduleGroups = [
  {
    icon: Users,
    title: "Cadastros",
    items: [
      "Clientes, fornecedores e transportadoras",
      "Representantes — tudo em um só lugar",
    ],
  },
  {
    icon: Package,
    title: "Produtos",
    items: [
      "Cadastro de categoria",
      "Marca",
      "Unidade de medida",
      "Produto",
    ],
  },
  {
    icon: UserCog,
    title: "Recursos Humanos",
    items: [
      "Cadastro de funções e cargos",
      "Setores e horários",
      "EPI",
      "Colaboradores com função, salário e horário de trabalho",
      "Controle de exames médicos e acompanhamento",
      "Avisos de aniversariantes do mês",
      "Ponto, com acompanhamento de horas positivas e negativas",
      "Faltas e abonos",
      "Folha de pagamento e 13º salário",
      "Programação de férias",
      "Dashboard de RH",
    ],
  },
  {
    icon: Truck,
    title: "Compras",
    items: ["Cotações", "Pedidos", "Compras", "Recebimento"],
  },
  {
    icon: ShoppingCart,
    title: "Vendas",
    items: ["Orçamento", "Pedido", "Vendas"],
  },
  {
    icon: Boxes,
    title: "Estoque",
    items: ["Movimentações", "Saldo em estoque"],
  },
  {
    icon: Banknote,
    title: "Financeiro",
    items: [
      "Contas a receber",
      "Contas a pagar",
      "Fluxo de caixa",
      "Orçamento mês a mês",
    ],
  },
  {
    icon: Factory,
    title: "Produção",
    items: ["Ordem de produção", "Acompanhamento de produção"],
  },
  {
    icon: BarChart3,
    title: "Dashboard e relatórios",
    items: [
      "Gráficos de colaboradores",
      "Gráfico de fluxo de caixa",
      "Relatórios para todos os módulos",
    ],
  },
];

/** Configurações que ficam sob controle do administrador da empresa — não são "módulos" de operação, mas de gestão do próprio sistema. */
const adminGroups = [
  {
    icon: ShieldCheck,
    title: "Segurança",
    items: ["Cadastro de usuários com acesso ao sistema", "Perfis de acesso"],
  },
  {
    icon: Plug,
    title: "APIs",
    items: ["Opcionalidade para configurar avisos automáticos no WhatsApp"],
  },
  {
    icon: Building2,
    title: "Empresa",
    items: [
      "Alteração de dados da empresa",
      "Cadastro de empresas do grupo — filiais ou outra empresa raiz",
    ],
  },
  {
    icon: Settings2,
    title: "Configurações",
    items: ["Manutenção das bases de apoio de cada módulo"],
  },
  {
    icon: Palette,
    title: "Personalização",
    items: [
      "Tema escuro",
      "Sua própria logo e marca",
      "Nome da sua empresa",
      "Forma de visão do menu inicial",
    ],
  },
  {
    icon: KeyRound,
    title: "Licenciamento",
    items: ["Plano atual, com possibilidade de incluir novos módulos"],
  },
];

/** Quem essa página tenta convencer — pequenas empresas ainda em planilha, e comércio/indústria em geral. */
const audienceItems = [
  {
    icon: Store,
    title: "Quem está começando",
    description:
      "Pequenas empresas que ainda controlam tudo em planilha e precisam migrar pra um sistema de verdade.",
  },
  {
    icon: Factory,
    title: "Comércio, indústria e muito mais",
    description:
      "Comércio em geral, fábricas e outros negócios que precisam de cadastros, estoque, vendas, compras e financeiro integrados.",
  },
];

const valueProps = [
  {
    icon: Palette,
    title: "Configure com a sua marca",
    description: "Logo, nome e cores da sua empresa — o sistema fica com a sua cara.",
  },
  {
    icon: Cloud,
    title: "100% online",
    description: "Nada fica instalado no computador — acesse de onde estiver.",
  },
  {
    icon: Users,
    title: "Usuários ilimitados",
    description: "Sem taxa por usuário — cadastre quantos precisar.",
  },
];

const demoBullets = [
  { icon: LayoutDashboard, label: "Veja o sistema funcionando na prática" },
  { icon: Layers, label: "Tire dúvidas sobre os módulos" },
  { icon: BadgeCheck, label: "Entenda qual módulo atende sua empresa" },
  { icon: List, label: "Conheça os planos e funcionalidades" },
  { icon: ShieldCheck, label: "Receba orientação pra começar com segurança" },
];

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: "O sistema é online?",
    answer:
      "Sim, o sistema AlePejo ERP Cloud é 100% online e pode ser acessado de qualquer lugar, sem necessidade de instalação na sua máquina.",
  },
  {
    question: "O sistema tem limite de usuários?",
    answer:
      "Não. Com a compra realizada, usuários são ilimitados, podendo parametrizar o que cada usuário terá acesso e permissão para executar.",
  },
  {
    question: "Se adquirir um plano, a licença é só para a empresa matriz?",
    answer:
      "Não, é ilimitado. Após a compra você pode cadastrar quantas filiais quiser, cada filial tem a sua visão no sistema, e o administrador consegue ver o resultado de todas as empresas, sem precisar de um módulo novo pra isso.",
  },
  {
    question: "Consigo emitir nota fiscal?",
    answer:
      "Não, esse sistema não oferece emissão de notas — mas tem controle das emissões, vinculando a nota fiscal de compra ou venda aos seus módulos.",
  },
  {
    question: "A implantação é gratuita?",
    answer:
      "Sim. Por ser 100% online, não precisa instalar nada em servidor ou computador.",
  },
  {
    question: "Vocês oferecem treinamento?",
    answer:
      "Sim, treinamento gratuito em acesso remoto. Treinamento presencial também é possível, assistido, com custo de deslocamento.",
  },
  {
    question: "O sistema tem suporte?",
    answer: "Sim, temos suporte 24h.",
  },
  {
    question: "O sistema tem controle financeiro?",
    answer:
      "Sim, o sistema AlePejo ERP Cloud possui vínculos automáticos em compras e vendas, gerando títulos a pagar e a receber com acompanhamento — pra não esquecer nenhum título.",
  },
  {
    question: "O sistema tem controle de estoque?",
    answer:
      "Sim, o sistema conta com estoque online: comprou e recebeu, o produto já entra no estoque; confirmou uma venda, o material já é retirado do estoque — com possibilidade de ajustes.",
  },
  {
    question: "O sistema tem controle de RH?",
    answer:
      "Sim, é bem completo pra quem quer controlar colaboradores: função, salários, horas, exames médicos e muito mais.",
  },
  {
    question: "O sistema tem controle de marcação de horas?",
    answer:
      "Sim — além do controle de gestão de RH, o sistema também tem controle de marcação de ponto.",
  },
  {
    question: "O sistema possui controle de banco de horas?",
    answer:
      "Sim. No acompanhamento de horas você consegue controlar horas positivas e negativas. Como não há vínculo a sindicatos, se as horas não forem compensadas durante o mês até o cálculo da folha, elas entram como pagamento de horas extras.",
  },
  {
    question: "O sistema tem geração de holerites?",
    answer: "Sim, esse módulo é mais um diferencial do sistema AlePejo.",
  },
  {
    question: "E se eu não souber qual plano escolher?",
    answer:
      "É só entrar em contato que avaliamos a sua necessidade e quais módulos seriam mais adequados pra sua empresa.",
  },
];

function Features() {
  return (
    <section
      id="funcionalidades"
      className="border-t border-[var(--border)] bg-[var(--surface)] py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            O que esperar do sistema AlePejo ERP Cloud
          </h2>

          <p className="mt-3 text-[var(--text-muted)]">
            O Sistema AlePejo ERP Cloud oferece funcionalidades essenciais
            para empresas que querem manter a operação em dia com mais
            simplicidade. Cada módulo conversa com os outros — o que entra
            em Vendas reflete no Estoque e no Financeiro, sem digitar duas
            vezes.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {spotlightFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-7"
            >
              <span className="inline-flex rounded-xl bg-[var(--primary)]/10 p-3 text-[var(--primary)]">
                <feature.icon size={22} />
              </span>

              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                {feature.title}
              </h3>

              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {moduleGroups.map((mod) => (
            <div
              key={mod.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 transition-colors hover:border-[var(--primary)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex rounded-lg bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
                  <mod.icon size={16} />
                </span>
                <p className="font-semibold text-[var(--text-primary)]">
                  {mod.title}
                </p>
              </div>

              <ul className="mt-3 space-y-1.5">
                {mod.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-[var(--text-muted)]"
                  >
                    <CheckCircle2
                      size={13}
                      className="mt-0.5 shrink-0 text-[var(--success)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Recursos de gestão do próprio sistema (não são módulos de operação
 * do dia a dia) — mesmo layout de card do Features(), seção separada
 * pra deixar claro que é outra categoria de funcionalidade.
 */
function AdminSection() {
  return (
    <section className="border-t border-[var(--border)] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            Administração do sistema
          </h2>

          <p className="mt-3 text-[var(--text-muted)]">
            O administrador da empresa tem controle total sobre quem acessa
            o quê, e sobre a cara do sistema.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {adminGroups.map((group) => (
            <div
              key={group.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--primary)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex rounded-lg bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
                  <group.icon size={16} />
                </span>
                <p className="font-semibold text-[var(--text-primary)]">
                  {group.title}
                </p>
              </div>

              <ul className="mt-3 space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-[var(--text-muted)]"
                  >
                    <CheckCircle2
                      size={13}
                      className="mt-0.5 shrink-0 text-[var(--success)]"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Quer configurar sua marca / 100% online / usuários ilimitados" — os 3 diferenciais logo abaixo do Hero. */
function ValueProps() {
  return (
    <section className="border-t border-[var(--border)] bg-[var(--surface)] py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {valueProps.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="inline-flex shrink-0 rounded-xl bg-[var(--primary)]/10 p-2.5 text-[var(--primary)]">
                <item.icon size={20} />
              </span>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {item.title}
                </p>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Quem pode usar essa ferramenta?" */
function Audience() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            Quem pode usar essa ferramenta?
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {audienceItems.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7"
            >
              <span className="inline-flex rounded-xl bg-[var(--primary)]/10 p-3 text-[var(--primary)]">
                <item.icon size={22} />
              </span>

              <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                {item.title}
              </h3>

              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Banner de chamada pra demonstração personalizada, com botão levando pro formulário de contato. */
function DemoCta() {
  return (
    <section className="border-t border-[var(--border)] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="overflow-hidden rounded-3xl bg-[var(--primary)] px-6 py-12 text-center sm:px-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-contrast)]/15 px-3 py-1 text-xs font-semibold text-[var(--primary-contrast)]">
            <CalendarClock size={13} />
            Demonstração personalizada
          </span>

          <h2 className="mt-4 text-3xl font-bold text-[var(--primary-contrast)]">
            Agende agora mesmo uma demonstração do Sistema AlePejo
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-[var(--primary-contrast)]/85">
            Nossa equipe vai te mostrar na prática como o sistema pode
            ajudar sua empresa a organizar informações e simplificar a
            gestão.
          </p>

          <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {demoBullets.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2.5 rounded-xl bg-[var(--primary-contrast)]/10 px-4 py-3 text-sm font-medium text-[var(--primary-contrast)]"
              >
                <item.icon size={16} className="shrink-0" />
                {item.label}
              </div>
            ))}
          </div>

          <a
            href="#contato"
            className="mt-8 inline-block rounded-xl bg-[var(--primary-contrast)] px-6 py-3 text-sm font-semibold text-[var(--primary)] transition-opacity hover:opacity-90"
          >
            Agendar demonstração
          </a>
        </div>
      </div>
    </section>
  );
}

/** Perguntas frequentes — sanfona, só uma aberta por vez. */
function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="perguntas-frequentes"
      className="border-t border-[var(--border)] bg-[var(--surface)] py-20"
    >
      <div className="mx-auto max-w-3xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            Perguntas frequentes
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.question}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    {item.question}
                  </span>

                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[var(--text-muted)] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <p className="px-5 pb-4 text-sm text-[var(--text-muted)]">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Demo() {
  const [active, setActive] = useState(demoTabs[0].id);

  return (
    <section id="demonstracao" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            Veja como fica na prática
          </h2>

          <p className="mt-3 text-[var(--text-muted)]">
            Uma prévia de como cada módulo aparece dentro do sistema —
            dados de exemplo, só pra ilustrar.
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-2">
          {demoTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                active === t.id
                  ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-6xl">
          <AppPreview activeId={active} onSelect={setActive} interactive />
        </div>
      </div>
    </section>
  );
}

function Implantacao() {
  return (
    <section
      id="implantacao"
      className="border-t border-[var(--border)] bg-[var(--surface)] py-20"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <GraduationCap size={12} className="text-[var(--primary)]" />
            Opcional
          </span>

          <h2 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
            Implantação e treinamento presencial
          </h2>

          <p className="mt-3 text-[var(--text-muted)]">
            Se preferir não configurar sozinho, também fazemos a implantação
            e o treinamento da sua equipe presencialmente, na sua empresa —
            cadastros iniciais, parametrização e acompanhamento até o time
            pegar o jeito do sistema.
          </p>

          <Link
            href="#contato"
            className="mt-6 inline-block rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--background)]"
          >
            Perguntar sobre implantação
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Configuração inicial",
              description:
                "Cadastros de apoio, plano de contas e parâmetros ajustados com a sua operação.",
            },
            {
              title: "Treinamento da equipe",
              description:
                "Time treinado nas telas do dia a dia, presencialmente ou remoto.",
            },
            {
              title: "Migração de dados",
              description:
                "Importação dos cadastros de clientes, produtos e estoque existentes.",
            },
            {
              title: "Acompanhamento",
              description:
                "Suporte próximo nas primeiras semanas de uso, até a equipe ganhar ritmo.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5"
            >
              <p className="font-semibold text-[var(--text-primary)]">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function setField(field: keyof typeof emptyForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit() {
    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await contactService.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        message: form.message.trim(),
      });

      setDone(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível enviar sua mensagem.")
      );
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = `
    h-11 w-full rounded-xl border border-[var(--border)]
    bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
    outline-none transition-colors
    focus:border-[var(--primary)]
  `;

  const labelClass =
    "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

  return (
    <section id="contato" className="border-t border-[var(--border)] py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            Fale com a gente
          </h2>

          <p className="mt-3 text-[var(--text-muted)]">
            Tem dúvida sobre os planos, os módulos, ou quer saber mais sobre
            implantação e treinamento? Manda uma mensagem.
          </p>

          <div className="mt-8 space-y-4 text-sm text-[var(--text-secondary)]">
            <a
              href="mailto:suporte@alepejo.com.br"
              className="flex items-center gap-3 hover:text-[var(--text-primary)]"
            >
              <Mail size={18} className="text-[var(--primary)]" />
              suporte@alepejo.com.br
            </a>

            <a
              href="https://wa.me/5543991544557"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:text-[var(--text-primary)]"
            >
              <MessageCircle size={18} className="text-[var(--primary)]" />
              (43) 9 9154-4557
            </a>

            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-[var(--primary)]" />
              Atendimento remoto ou presencial para todo o Brasil
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          {done ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <CheckCircle2 size={32} className="text-[var(--success)]" />
              <p className="font-medium text-[var(--text-primary)]">
                Mensagem enviada!
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Vamos responder em breve no e-mail informado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="name">
                    Nome <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="name"
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="contactEmail">
                    E-mail <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    className={fieldClass}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="contactPhone">
                    Telefone
                  </label>
                  <input
                    id="contactPhone"
                    className={fieldClass}
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="contactCompany">
                    Empresa
                  </label>
                  <input
                    id="contactCompany"
                    className={fieldClass}
                    value={form.company}
                    onChange={(e) => setField("company", e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="contactMessage">
                    Mensagem <span className="text-[var(--danger)]">*</span>
                  </label>
                  <textarea
                    id="contactMessage"
                    rows={4}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
                    value={form.message}
                    onChange={(e) => setField("message", e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSubmit()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Enviando..." : "Enviar mensagem"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const trialDays = useTrialDays();

  return (
    <section className="border-t border-[var(--border)] bg-[var(--surface)] py-20 text-center">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-3xl font-bold text-[var(--text-primary)]">
          Pronto pra simplificar a gestão da sua empresa?
        </h2>

        <p className="mt-3 text-[var(--text-muted)]">
          {trialDays} dia{trialDays === 1 ? "" : "s"} grátis, sem cartão de
          crédito. Escolha o plano e comece agora.
        </p>

        <Link
          href="/planos"
          className="mt-8 inline-block rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
        >
          Ver planos e preços
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-[var(--text-muted)]">
        <p>© {new Date().getFullYear()} AlePejo Tecnologia Ltda.</p>

        <Link
          href="/privacidade"
          className="font-medium hover:text-[var(--text-primary)] hover:underline"
        >
          Política de Privacidade
        </Link>
      </div>
    </footer>
  );
}

export default function InstitucionalPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicNav />
      <Hero />
      <ValueProps />
      <Audience />
      <Features />
      <AdminSection />
      <Demo />
      <DemoCta />
      <Implantacao />
      <Faq />
      <Contact />
      <FinalCta />
      <Footer />
    </div>
  );
}
