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
  Banknote,
  Bell,
  Boxes,
  CheckCircle2,
  Clock,
  Factory,
  GraduationCap,
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
  PiggyBank,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
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

const features = [
  {
    icon: Users,
    title: "Cadastros",
    description: "Clientes, fornecedores e transportadoras num cadastro único.",
  },
  {
    icon: Package,
    title: "Produtos",
    description: "Produtos e serviços, com categorias, marcas e unidades de medida.",
  },
  {
    icon: Boxes,
    title: "Estoque",
    description: "Saldo por depósito e movimentações em tempo real.",
  },
  {
    icon: ShoppingCart,
    title: "Vendas",
    description: "Orçamento, pedido e venda até o faturamento.",
  },
  {
    icon: Truck,
    title: "Compras",
    description: "Cotação com fornecedores, pedido e recebimento.",
  },
  {
    icon: Banknote,
    title: "Financeiro",
    description: "Contas a pagar/receber, fluxo de caixa e dashboard com gráficos.",
  },
  {
    icon: Factory,
    title: "Produção",
    description: "Ordens de produção em etapas, do início ao acompanhamento.",
  },
  {
    icon: UserCog,
    title: "Recursos Humanos",
    description: "Colaboradores, benefícios, exames e EPIs num só lugar.",
  },
  {
    icon: Clock,
    title: "Ponto e Folha",
    description: "Marcação de ponto, folha mensal, 13º e férias.",
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
            Um sistema, todos os processos da empresa
          </h2>

          <p className="mt-3 text-[var(--text-muted)]">
            Cada módulo conversa com os outros — o que entra em Vendas
            reflete no Estoque e no Financeiro, sem digitar duas vezes.
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

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 transition-colors hover:border-[var(--primary)]"
            >
              <feature.icon
                size={18}
                className="mt-0.5 shrink-0 text-[var(--primary)]"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
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
      <Features />
      <Demo />
      <Implantacao />
      <Contact />
      <FinalCta />
      <Footer />
    </div>
  );
}
