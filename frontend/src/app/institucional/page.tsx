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
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Eye,
  LayoutDashboard,
  Loader2,
  List,
  Mail,
  MapPin,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  ShoppingCart,
  Smartphone,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import { systemConfig } from "@/config/system";
import { contactService } from "@/services/contact.service";
import { companyOnboardingService } from "@/services/company-onboarding.service";
import { siteVisitService } from "@/services/site-visit.service";
import { PublicNav } from "@/components/marketing/PublicNav";
import { Faq } from "@/components/marketing/Faq";
import { ChromaKeyVideo } from "@/components/marketing/ChromaKeyVideo";
import { pickVoice, stepDuration, useSpeechVoices } from "@/components/marketing/guided-narration";
import { erpFontVars } from "@/components/marketing/fonts";
import { ErpAudience, ErpFeatures, ErpHero, ErpShowcase, ErpValueProps } from "@/components/marketing/ErpSections";
import "@/components/marketing/marketing-shared.css";
import "@/components/marketing/servicos.css";
import "@/components/marketing/erp.css";

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
  { month: "Jul", receita: 38900, despesa: 20100 },
  { month: "Ago", receita: 44500, despesa: 23800 },
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
};

type BadgeTone = "success" | "warning" | "danger" | "neutral";

type DemoListRow = (string | { label: string; tone: BadgeTone })[];

const BADGE_CLASS: Record<BadgeTone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  neutral: "bg-[var(--primary-soft)] text-[var(--text-secondary)]",
};

const demoTabs: {
  id: string;
  icon: any;
  label: string;
  pageTitle: string;
  subtitle: string;
  newLabel?: string;
  narration: string;
  columns: string[];
  rows: DemoListRow[];
  hasDashboard?: boolean;
}[] = [
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
  {
    id: "rh",
    icon: Users,
    label: "RH",
    pageTitle: "Recursos Humanos",
    subtitle: "Colaboradores, folha e ponto.",
    newLabel: "Novo colaborador",
    narration:
      "Gerencie colaboradores, calcule folha de pagamento com todos os encargos, e controle ponto eletrônico com integração de leitores biométricos.",
    columns: ["Nome", "Cargo", "Admissão", "Situação"],
    rows: [
      ["João Silva", "Analista", "15/03/2024", { label: "Ativo", tone: "success" as BadgeTone }],
      ["Maria Santos", "Assistente", "01/02/2024", { label: "Ativo", tone: "success" as BadgeTone }],
    ],
  },
  {
    id: "producao",
    icon: Cpu,
    label: "Produção",
    pageTitle: "Produção",
    subtitle: "Ordens de produção e acompanhamento.",
    newLabel: "Nova ordem",
    narration:
      "Acompanhe ordens de produção em tempo real, gerencie recursos e otimize o fluxo de trabalho da sua equipe.",
    columns: ["Ordem", "Produto", "Status", "Prazo"],
    rows: [
      ["OP-001", "Servidor Rack", "Em andamento", "25/08"],
      ["OP-002", "Switch 48p", "Concluído", "20/08"],
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
        <div key={c.label} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
          <p className="text-xs font-medium text-[var(--text-muted)]">{c.label}</p>
          <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{c.value}</p>
          {c.sub && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function ListMock({ columns, rows }: { columns: string[]; rows: DemoListRow[] }) {
  return (
    <>
      <div className="mt-4 flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--text-muted)]">
        <Search size={13} />
        Pesquisar...
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
        <div className="min-w-[440px]">
          <div className="flex bg-[var(--background)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">
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
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={financeiroChartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
          <XAxis dataKey="month" className="text-xs text-[var(--text-muted)]" />
          <YAxis className="text-xs text-[var(--text-muted)]" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="receita" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesa" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
}

// ============ DEMO TOUR ============
function DemoTour() {
  const [tabIndex, setTabIndex] = useState(0);
  const [view, setView] = useState<"list" | "dashboard">("list");
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(true);
  const [started, setStarted] = useState(false);
  // Só no cliente (após montar): evita divergência entre o HTML do servidor e o da hidratação.
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => {
    setCanSpeak("speechSynthesis" in window);
  }, []);
  const voices = useSpeechVoices();

  const tab = demoTabs[tabIndex];

  function switchTrack(next: number) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setTabIndex(next);
    setView("list");
    setPlaying(false);
    setStarted(false);
  }

  useEffect(() => {
    if (!playing) return;

    let cancelled = false;

    function advance() {
      if (cancelled) return;
      if (tabIndex < demoTabs.length - 1) {
        setTabIndex(tabIndex + 1);
      } else {
        setPlaying(false);
      }
    }

    if (sound && canSpeak) {
      const utterance = new SpeechSynthesisUtterance(tab.narration);
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

    const timer = setTimeout(advance, stepDuration(tab.narration));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [playing, sound, tabIndex, tab.narration, canSpeak]);

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

  const finished = started && !playing && tabIndex === demoTabs.length - 1;

  return (
    <section id="demonstracao" className="scroll-mt-20 py-24 bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 max-w-2xl">
          <p className="erp-eyebrow erp-eyebrow-light mb-5">Demonstração guiada</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] mb-4">
            Veja o sistema em ação
          </h2>
          <p className="text-lg text-[var(--text-muted)]">
            Tour guiado com narração de cada módulo
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {demoTabs.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTrack(i)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  i === tabIndex
                    ? "erp-accent text-white"
                    : "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]"
                }`}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--background)] p-6">
            {!started && (
              <button
                type="button"
                onClick={play}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-slate-900/60 backdrop-blur-[2px] transition-colors hover:bg-slate-900/68"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full erp-accent text-white shadow-2xl">
                  <Play size={28} className="ml-1" fill="currentColor" />
                </span>
                <span className="text-base font-semibold text-white">Iniciar demonstração</span>
                <span className="text-sm text-white/80">
                  {demoTabs.length} módulos{canSpeak ? " · com narração" : ""}
                </span>
              </button>
            )}

            <div className="flex gap-6">
              <div className="hidden w-64 shrink-0 flex-col gap-2 border-r border-[var(--border)] p-4 lg:flex">
                <div className="mb-4 flex items-center gap-3 px-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg erp-accent text-white">
                    <LayoutDashboard size={16} />
                  </span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">AlePejo ERP</span>
                </div>

                {demoTabs.map((t, i) => {
                  const isActive = i === tabIndex;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => switchTrack(i)}
                      className={`flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "erp-accent text-white"
                          : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)]"
                      }`}
                    >
                      <t.icon size={16} className="shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{tab.pageTitle}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{tab.subtitle}</p>
                  </div>
                  {tab.newLabel && (
                    <span className="flex items-center gap-1.5 rounded-xl erp-accent px-3 py-2 text-xs font-semibold text-white">
                      <Plus size={13} />
                      {tab.newLabel}
                    </span>
                  )}
                </div>

                <div className="min-h-[350px]">
                  {view === "dashboard" && tab.hasDashboard ? (
                    <FinanceChartMock />
                  ) : (
                    tab.columns && tab.rows && <ListMock columns={tab.columns} rows={tab.rows} />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full erp-accent transition-all duration-500"
                    style={{ width: `${((tabIndex + 1) / demoTabs.length) * 100}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">
                  {tabIndex + 1} de {demoTabs.length}
                </span>
              </div>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <div className="flex shrink-0 flex-col items-center">
                  <ChromaKeyVideo
                    src={playing ? "/videos/robo falando.mp4" : "/videos/Robo normal.mp4"}
                    loop={true}
                    className="h-auto w-[100px] sm:w-[115px]"
                  />
                </div>

                <div className="relative min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{tab.label}</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{tab.narration}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (finished) {
                      setTabIndex(0);
                      setPlaying(true);
                      return;
                    }
                    if (playing) {
                      setPlaying(false);
                      return;
                    }
                    play();
                  }}
                  className="flex items-center gap-2 rounded-xl erp-accent px-4 py-2.5 text-sm font-semibold text-white"
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
                  disabled={tabIndex === 0}
                  onClick={() => switchTrack(tabIndex - 1)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--primary)] disabled:opacity-40"
                >
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={tabIndex === demoTabs.length - 1}
                  onClick={() => switchTrack(tabIndex + 1)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--primary)] disabled:opacity-40"
                >
                  Próximo
                </button>

                {canSpeak && (
                  <button
                    type="button"
                    onClick={() => setSound(!sound)}
                    className="ml-auto flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]"
                  >
                    {sound ? <Settings2 size={16} /> : <Settings2 size={16} />}
                    {sound ? "Som ligado" : "Som desligado"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============ CONTACT ============
function Contact() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      await contactService.submit(form);
      setSuccess(true);
      setForm(emptyForm);
    } catch (err) {
      setError(extractMessage(err, "Erro ao enviar mensagem. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contato" className="scroll-mt-20 py-24 bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Entre em contato
            </h2>
            <p className="text-lg text-[var(--text-muted)] mb-8">
              Tem dúvidas ou quer saber mais? Nossa equipe está pronta para ajudar.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl erp-accent text-white">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Email</p>
                  <p className="font-semibold text-[var(--text-primary)]">contato@alepejo.com.br</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl erp-accent text-white">
                  <Smartphone size={20} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Telefone</p>
                  <p className="font-semibold text-[var(--text-primary)]">(43) 99154-4557</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl erp-accent text-white">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Endereço</p>
                  <p className="font-semibold text-[var(--text-primary)]">Londrina - PR, Brasil</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-8 shadow-xl">
            {success ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                    <CheckCircle2 size={36} />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Mensagem enviada!</h3>
                <p className="text-[var(--text-muted)]">Entraremos em contato em breve.</p>
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="mt-6 rounded-xl erp-accent px-6 py-3 font-semibold text-white"
                >
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Nome</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Telefone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Empresa</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
                    placeholder="Nome da sua empresa"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Mensagem</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/25"
                    placeholder="Como podemos ajudar?"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl erp-accent px-6 py-4 font-semibold text-white shadow-lg transition-transform hover:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    "Enviar mensagem"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============ FOOTER ============
function Footer() {
  const visits = useVisitCounter();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-[var(--text-muted)]">
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
            className="font-medium hover:text-slate-900 hover:underline"
          >
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function InstitucionalPage() {
  const trialDays = useTrialDays();

  return (
    <div className={`${erpFontVars} theme-erp min-h-screen`}>
      <PublicNav />
      <ErpHero trialDays={trialDays} />
      <ErpValueProps />
      <ErpShowcase />
      <ErpAudience />
      <ErpFeatures />
      <DemoTour />
      <Contact />
      <Footer />
    </div>
  );
}
