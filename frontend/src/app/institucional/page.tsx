"use client";

import { useEffect, useRef, useState } from "react";
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
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Globe,
  LayoutDashboard,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Play,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";

import { systemConfig } from "@/config/system";
import { contactService } from "@/services/contact.service";
import { companyOnboardingService } from "@/services/company-onboarding.service";
import { siteVisitService } from "@/services/site-visit.service";
import { PublicNav } from "@/components/marketing/PublicNav";
import { Faq } from "@/components/marketing/Faq";
import { ChromaKeyVideo } from "@/components/marketing/ChromaKeyVideo";
import { pickVoice, stepDuration, useSpeechVoices } from "@/components/marketing/guided-narration";
import "@/components/marketing/aurora.css";

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

function useVisitCounter() {
  const [count, setCount] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) {
      return;
    }

    fired.current = true;

    siteVisitService
      .increment("institucional")
      .then(setCount)
      .catch(() => {});
  }, []);

  return count;
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

const demoTabs = [
  {
    id: "cadastros",
    icon: Users,
    label: "Cadastros",
    pageTitle: "Clientes e fornecedores",
    subtitle: "Quem compra de você e de quem você compra.",
    newLabel: "Novo cadastro",
    narration:
      "Tudo começa nos cadastros. Clientes, fornecedores, transportadoras e representantes ficam em um lugar só, e são usados por todos os outros módulos do sistema. Você cadastra uma vez e não digita a mesma informação de novo.",
    columns: ["Nome", "Tipo", "Cidade", "Situação"],
    rows: [
      ["Comércio Silva Ltda", "Cliente", "Curitiba - PR", { label: "Ativo", tone: "success" as BadgeTone }],
      ["Distribuidora Norte", "Fornecedor", "Londrina - PR", { label: "Ativo", tone: "success" as BadgeTone }],
      ["Transportes Rápido", "Transportadora", "Maringá - PR", { label: "Ativo", tone: "success" as BadgeTone }],
    ],
  },
  {
    id: "produtos",
    icon: Store,
    label: "Produtos",
    pageTitle: "Produtos",
    subtitle: "Categoria, marca e unidade de medida.",
    newLabel: "Novo produto",
    narration:
      "No módulo de produtos você define a categoria, a marca e a unidade de medida. Quando você vende, o sistema dá baixa automática no estoque e já gera o título financeiro.",
    columns: ["Produto", "Categoria", "Estoque", "Preço"],
    rows: [
      ["Notebook Dell Latitude", "Informática", "12 un", "R$ 4.500,00"],
      ["Cadeira Giratória", "Móveis", "8 un", "R$ 650,00"],
      ["Monitor 27\"", "Informática", "15 un", "R$ 890,00"],
    ],
  },
  {
    id: "compras",
    icon: ShoppingCart,
    label: "Compras",
    pageTitle: "Compras",
    subtitle: "Cotações, pedidos e recebimento.",
    newLabel: "Nova compra",
    narration:
      "Gere cotações com fornecedores, converta em pedido de compra e receba os produtos. O sistema atualiza o estoque e os custos automaticamente.",
    columns: ["Pedido", "Fornecedor", "Valor", "Situação"],
    rows: [
      ["PC-001", "Distribuidora Norte", "R$ 12.500,00", { label: "Recebido", tone: "success" as BadgeTone }],
      ["PC-002", "Tech Supply", "R$ 8.200,00", { label: "Em andamento", tone: "warning" as BadgeTone }],
    ],
  },
  {
    id: "estoque",
    icon: Database,
    label: "Estoque",
    pageTitle: "Estoque",
    subtitle: "Depósitos, inventário e movimentações.",
    newLabel: "Nova movimentação",
    narration:
      "Controle vários depósitos, faça inventário periódico e acompanhe todas as movimentações de entrada e saída.",
    columns: ["Produto", "Depósito", "Quantidade", "Tipo"],
    rows: [
      ["Notebook Dell Latitude", "Matriz", "12 un", "Entrada"],
      ["Cadeira Giratória", "Filial", "5 un", "Saída"],
    ],
  },
  {
    id: "financeiro",
    icon: BarChart3,
    label: "Financeiro",
    pageTitle: "Financeiro",
    subtitle: "Fluxo de caixa e gestão financeira.",
    newLabel: "Novo lançamento",
    hasDashboard: true,
    narration:
      "Acompanhe o fluxo de caixa em tempo real, gerencie contas a pagar e receber, e visualize gráficos de receita versus despesa.",
    columns: ["Data", "Descrição", "Valor", "Tipo"],
    rows: [
      ["15/08", "Venda PC-001", "R$ 12.500,00", "Receita"],
      ["15/08", "Compra PC-002", "R$ 8.200,00", "Despesa"],
    ],
  },
  {
    id: "vendas",
    icon: TrendingUp,
    label: "Vendas",
    pageTitle: "Vendas",
    subtitle: "Pedidos, orçamentos e ordens de serviço.",
    newLabel: "Nova venda",
    narration:
      "Gere pedidos de venda, crie orçamentos e transforme em ordens de serviço. O sistema integra tudo com estoque e financeiro.",
    columns: ["Pedido", "Cliente", "Valor", "Situação"],
    rows: [
      ["PV-001", "Comércio Silva Ltda", "R$ 15.300,00", { label: "Faturado", tone: "success" as BadgeTone }],
      ["PV-002", "Indústria Tech", "R$ 8.900,00", { label: "Orçamento", tone: "warning" as BadgeTone }],
    ],
  },
];

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

function KpiCardsMock({ cards }: { cards: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-3.5">
          <p className="text-xs font-medium text-[var(--text-muted)]">{c.label}</p>
          <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{c.value}</p>
          {c.sub && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function ListMock({ columns, rows }: { columns: string[]; rows: (string | { label: string; tone: BadgeTone })[] }) {
  return (
    <>
      <div className="mt-4 flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] px-3 text-xs text-[var(--text-muted)]">
        <Search size={13} />
        Pesquisar...
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
        <div className="min-w-[440px]">
          <div className="flex bg-[var(--surface-hover)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">
            {columns.map((col, i) => (
              <span key={col} className={i === 0 ? "flex-1" : "w-28 shrink-0 text-right"}>
                {col}
              </span>
            ))}
          </div>
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center border-t border-[var(--border)] px-4 py-3 text-sm">
              {row.map((cell, cellIndex) => (
                <span
                  key={cellIndex}
                  className={cellIndex === 0 ? "flex-1 truncate text-[var(--text-primary)]" : "w-28 shrink-0 text-right text-[var(--text-muted)]"}
                >
                  {typeof cell === "object" ? <Badge label={cell.label} tone={cell.tone} /> : cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FinanceChartMock() {
  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Receita realizada x despesa</p>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={financeiroChartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => chartMoney(Number(v))} width={48} />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => chartMoney(Number(v))}
            />
            <Bar dataKey="receita" name="Receita" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesa" name="Despesa" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
    <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
      <div className="flex">
        <div className="hidden w-52 shrink-0 flex-col gap-1 border-r border-[var(--border)] p-3 md:flex">
          <div className="mb-2 flex items-center gap-2 px-2 py-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
              <LayoutDashboard size={14} />
            </span>
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
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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

            <span className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-2 text-xs font-semibold text-white">
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
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                    : "border border-[var(--border)] text-[var(--text-secondary)]"
                }`}
              >
                <BarChart3 size={13} />
                Dashboard
              </button>
            </div>
          )}

          {view === "dashboard" && tab.hasDashboard ? (
            <FinanceChartMock />
          ) : (
            tab.columns && tab.rows && <ListMock columns={tab.columns} rows={tab.rows} />
          )}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const trialDays = useTrialDays();

  return (
    <section className="relative z-0 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.15),transparent_50%)]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(6,182,212,0.15),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2">
              <Sparkles size={16} className="text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-300">
                ERP completo para sua empresa
              </span>
            </div>

            <h1 className="font-display text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
              Sistema ERP
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                na nuvem
              </span>
            </h1>

            <p className="max-w-2xl text-xl text-blue-100/80 leading-relaxed">
              Gerencie toda sua empresa em um só lugar: compras, estoque, financeiro,
              vendas, RH e produção. Simples, completo e acessível.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/planos"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-cyan-500/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/50"
              >
                Começar agora
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="#demonstracao"
                className="inline-flex items-center gap-2 rounded-full border-2 border-cyan-400/30 px-8 py-4 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-400 hover:text-white"
              >
                Ver demonstração
              </Link>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-cyan-300">
                <CheckCircle2 size={20} />
                <span className="text-sm">{trialDays} dias grátis</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-300">
                <CheckCircle2 size={20} />
                <span className="text-sm">Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-300">
                <CheckCircle2 size={20} />
                <span className="text-sm">Setup em minutos</span>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur-3xl" />
            <div className="relative glass-card rounded-3xl p-6 bg-white/10 backdrop-blur-xl border border-white/20">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ShoppingCart, label: "Compras", value: "2.5k" },
                  { icon: Database, label: "Estoque", value: "15k" },
                  { icon: BarChart3, label: "Financeiro", value: "R$ 8M" },
                  { icon: TrendingUp, label: "Vendas", value: "+45%" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                      <stat.icon size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-cyan-200">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ValueProps() {
  const props = [
    {
      icon: LayoutDashboard,
      title: "Tudo integrado",
      description: "Módulos conectados: compras alimenta estoque, vendas gera financeiro, tudo sincronizado.",
    },
    {
      icon: Smartphone,
      title: "Acesso móvel",
      description: "Acesse de qualquer lugar pelo celular ou tablet. Sua empresa no seu bolso.",
    },
    {
      icon: ShieldCheck,
      title: "Segurança total",
      description: "Dados criptografados, backups automáticos e controle de acesso por perfil.",
    },
    {
      icon: Zap,
      title: "Implantação rápida",
      description: "Setup em minutos, sem instalação complexa. Comece a usar hoje mesmo.",
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 px-4 py-2 mb-4">
            <Sparkles size={16} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Por que escolher
            </span>
          </span>
          <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
            Benefícios que transformam sua gestão
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {props.map((prop) => (
            <div
              key={prop.title}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-8 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-2xl hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform" />

              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-xl group-hover:scale-110 transition-transform">
                  <prop.icon size={28} />
                </div>

                <p className="font-display mt-6 text-xl font-bold text-slate-900 dark:text-white">
                  {prop.title}
                </p>
                <p className="mt-3 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                  {prop.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Audience() {
  const segments = [
    { icon: Factory, label: "Indústria" },
    { icon: Store, label: "Comércio" },
    { icon: Cpu, label: "Tecnologia" },
    { icon: Truck, label: "Logística" },
    { icon: MessageCircle, label: "Serviços" },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 px-4 py-2 mb-4">
            <Globe size={16} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Multi-setor
            </span>
          </span>
          <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
            Feito para diversos segmentos
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Do comércio à indústria, adapta-se ao seu negócio
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-xl hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg group-hover:scale-110 transition-transform">
                  <segment.icon size={28} />
                </span>
                <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                  {segment.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Database,
      title: "Gestão de Estoque",
      description: "Controle multi-depósito, inventário periódico e rastreabilidade completa.",
    },
    {
      icon: BarChart3,
      title: "Financeiro Integrado",
      description: "Fluxo de caixa, contas a pagar/receber e relatórios financeiros detalhados.",
    },
    {
      icon: ShoppingCart,
      title: "Compras e Vendas",
      description: "Cotações, pedidos, orçamentos e gestão completa do ciclo comercial.",
    },
    {
      icon: Users,
      title: "RH e Folha",
      description: "Gestão de colaboradores, folha de pagamento e benefícios.",
    },
    {
      icon: BadgeCheck,
      title: "Controle de Qualidade",
      description: "Padrões de qualidade, inspeções e certificações.",
    },
    {
      icon: LayoutDashboard,
      title: "Dashboard Executivo",
      description: "Visão geral de KPIs e indicadores de performance em tempo real.",
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 px-4 py-2 mb-4">
            <LayoutDashboard size={16} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Módulos completos
            </span>
          </span>
          <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
            Tudo que sua empresa precisa
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-8 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-2xl hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform" />

              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-xl group-hover:scale-110 transition-transform">
                  <feature.icon size={28} />
                </div>

                <p className="font-display mt-6 text-xl font-bold text-slate-900 dark:text-white">
                  {feature.title}
                </p>
                <p className="mt-3 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
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

function AdminSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 px-4 py-2 mb-4">
            <ShieldCheck size={16} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Administração completa
            </span>
          </span>
          <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
            Controle total do seu sistema
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Configure usuários, permissões, segurança e personalização
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: "Gestão de Usuários", desc: "Crie usuários e defina perfis de acesso" },
            { icon: ShieldCheck, title: "Permissões", desc: "Controle fino do que cada usuário pode fazer" },
            { icon: MapPin, title: "Multi-unidade", desc: "Gerencie várias filiais em um só sistema" },
            { icon: Settings2, title: "Personalização", desc: "Adapte o sistema ao seu negócio" },
          ].map((item) => (
            <div
              key={item.title}
              className="glass-card rounded-3xl p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg">
                <item.icon size={24} />
              </div>
              <p className="font-display mt-4 text-lg font-bold text-slate-900 dark:text-white">
                {item.title}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoTour() {
  const [activeId, setActiveId] = useState(demoTabs[0].id);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(true);
  const [started, setStarted] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);

  const step = demoTabs[index] ?? demoTabs[0];
  const voices = useSpeechVoices();
  const voice = pickVoice(voices);

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (!playing) {
      return;
    }

    let cancelled = false;

    function advance() {
      if (cancelled) {
        return;
      }
      if (index < demoTabs.length - 1) {
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
  }, [playing, sound, index, step.narration, canSpeak, voice]);

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

  const finished = started && !playing && index === demoTabs.length - 1;

  return (
    <section id="demonstracao" className="py-24 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 px-4 py-2 mb-4">
            <Play size={16} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Demonstração interativa
            </span>
          </span>
          <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
            Veja o sistema em ação
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Explore os principais módulos do AlePejo ERP Cloud
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <AppPreview activeId={activeId} onSelect={(id) => goTo(demoTabs.findIndex((t) => t.id === id))} interactive />

          {!started && (
            <button
              type="button"
              onClick={play}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-[rgb(15_23_42_/_0.7)] backdrop-blur-[2px] transition-colors hover:bg-[rgb(15_23_42_/_0.8)]"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-2xl">
                <Play size={28} className="ml-1" fill="currentColor" />
              </span>
              <span className="text-lg font-semibold text-white">Ver demonstração</span>
              <span className="text-sm text-white/80">
                {demoTabs.length} módulos{canSpeak ? " · com narração" : ""}
              </span>
            </button>
          )}
        </div>

        {started && (
          <div className="mx-auto mt-8 max-w-4xl">
            <div className="mx-auto flex flex-wrap justify-center gap-2 mb-6">
              {demoTabs.map((tab, position) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => goTo(position)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    position === index
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                      : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-cyan-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg">
                  <span className="text-xl font-bold">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {step.pageTitle}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{step.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlaying(!playing)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:text-cyan-600 transition-colors"
                  >
                    {playing ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSound(!sound)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:text-cyan-600 transition-colors"
                  >
                    {sound ? <MessageCircle size={18} /> : <MessageCircle size={18} className="opacity-50" />}
                  </button>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.narration}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DemoCta() {
  const trialDays = useTrialDays();

  return (
    <section className="py-24 bg-gradient-to-r from-cyan-600 via-blue-600 to-slate-700 text-center">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="font-display text-4xl font-bold text-white mb-6">
          Comece a transformar sua gestão hoje
        </h2>

        <p className="text-xl text-white/90 mb-10">
          {trialDays} dias grátis, sem cartão de crédito. Teste todos os módulos sem compromisso.
        </p>

        <Link
          href="/planos"
          className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-slate-900 shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        >
          Começar teste grátis
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

function Implantacao() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 px-4 py-2 mb-4">
            <Clock size={16} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Implementação
            </span>
          </span>
          <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              Setup em minutos
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Comece a usar o sistema em 3 passos simples
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            { step: "1", title: "Cadastre sua empresa", desc: "Crie sua conta e configure as informações básicas" },
            { step: "2", title: "Configure os módulos", desc: "Ative os módulos que sua empresa precisa" },
            { step: "3", title: "Comece a usar", desc: "Importe seus dados e comece a gerenciar" },
          ].map((item) => (
            <div
              key={item.step}
              className="glass-card rounded-3xl p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-2xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <p className="font-display text-xl font-bold text-slate-900 dark:text-white mb-2">
                {item.title}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
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
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      await contactService.send(form);
      setSuccess(true);
      setForm(emptyForm);
    } catch (err) {
      setError(extractMessage(err, "Erro ao enviar mensagem. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30 px-4 py-2 mb-4">
            <Mail size={16} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Contato
            </span>
          </span>
          <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
            Fale com a gente
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Tem dúvidas? Entre em contato e respondemos em até 24h
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700">
          {success ? (
            <div className="text-center py-12">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white mx-auto mb-4">
                <CheckCircle2 size={36} />
              </div>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                Mensagem enviada com sucesso!
              </p>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Entraremos em contato em breve.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                    placeholder="Nome da sua empresa"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Mensagem
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all resize-none"
                  placeholder="Como podemos ajudar?"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSubmit()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/30 transition-all hover:scale-[1.02] hover:shadow-2xl disabled:opacity-60"
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
    <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-center">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-4xl font-bold text-white mb-6">
          Pronto para simplificar a gestão da sua empresa?
        </h2>

        <p className="text-xl text-blue-100/80 mb-10">
          {trialDays} dias grátis, sem cartão de crédito. Escolha o plano e comece agora.
        </p>

        <Link
          href="/planos"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-cyan-500/30 transition-all hover:scale-105 hover:shadow-2xl"
        >
          Ver planos e preços
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  const visits = useVisitCounter();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-slate-600 dark:text-slate-400">
        <p>
          © {new Date().getFullYear()} AlePejo Assessoria e Prestação de Serviço Ltda.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {visits != null && (
            <span className="flex items-center gap-1.5">
              <Eye size={13} />
              {visits.toLocaleString("pt-BR")} visitas
            </span>
          )}

          <Link
            href="/privacidade"
            className="font-medium hover:text-slate-900 dark:hover:text-white hover:underline"
          >
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function InstitucionalPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNav />
      <Hero />
      <ValueProps />
      <Audience />
      <Features />
      <AdminSection />
      <DemoTour />
      <DemoCta />
      <Implantacao />
      <Faq />
      <Contact />
      <FinalCta />
      <Footer />
    </div>
  );
}
