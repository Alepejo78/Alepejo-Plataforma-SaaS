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
  BadgeCheck,
  Banknote,
  Bell,
  Boxes,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Cloud,
  Eye,
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
  Pause,
  PiggyBank,
  Play,
  PlayCircle,
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
  Volume2,
  VolumeX,
  Wallet,
  Workflow,
} from "lucide-react";

import { systemConfig } from "@/config/system";
import { contactService } from "@/services/contact.service";
import { companyOnboardingService } from "@/services/company-onboarding.service";
import { siteVisitService } from "@/services/site-visit.service";
import { PublicNav } from "@/components/marketing/PublicNav";
import { Faq } from "@/components/marketing/Faq";
import {
  Mascote,
  type MascoteMood,
} from "@/components/marketing/Mascote";
import "@/components/marketing/aurora.css";

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

/**
 * Contador de visitas do rodapé — soma 1 no carregamento da página e
 * mostra o total (vindo do backend). Guarda com `useRef` pra não
 * contar duas vezes no StrictMode do React em desenvolvimento (o
 * efeito roda duas vezes só em dev, nunca em produção).
 */
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

/**
 * Mesmos módulos/telas de verdade do sistema — nome da tela, colunas
 * da tabela e o botão de ação são iguais aos das telas reais (ver
 * `app/erp/parceiros/page.tsx`, `CrudToolbar.tsx`): cabeçalho com
 * título e botão "Novo", busca, tabela com cabeçalho fixo e badge de
 * situação. Nada de cartões de indicador — as telas reais não têm.
 */
/**
 * Roteiro da demonstração guiada (ver `DemoTour`): cada item é uma
 * parada do tour — a tela simulada daquele módulo mais a narração que
 * o navegador lê em voz alta. A ordem segue o fluxo real da empresa
 * (cadastra → compra → estoca → vende → recebe), que é justamente o
 * argumento de venda: uma etapa alimenta a próxima.
 *
 * `narration` é texto puro de propósito: é o que a voz lê e o que
 * aparece na legenda, então nada de abreviação que a leitura estrague.
 */
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
    icon: Package,
    label: "Produtos",
    pageTitle: "Produtos",
    subtitle: "Categoria, marca e unidade de medida.",
    newLabel: "Novo produto",
    narration:
      "Em produtos você organiza o que a empresa vende ou fabrica, com categoria, marca e unidade de medida. É esse cadastro que alimenta o estoque, as compras e as vendas.",
    columns: ["Produto", "Categoria", "Unidade", "Preço de venda"],
    rows: [
      ["Cabo elétrico 2,5mm", "Elétrica", "Metro", "R$ 4,90"],
      ["Disjuntor 20A", "Elétrica", "Unidade", "R$ 28,50"],
      ["Luminária LED 40W", "Iluminação", "Unidade", "R$ 89,00"],
    ],
  },
  {
    id: "compras",
    icon: Truck,
    label: "Compras",
    pageTitle: "Pedidos de compra",
    subtitle: "Da cotação ao recebimento do fornecedor.",
    newLabel: "Novo pedido",
    narration:
      "No módulo de compras você faz a cotação, gera o pedido e registra o recebimento. Assim que o material é recebido, ele entra no estoque automaticamente e o valor vira uma conta a pagar no financeiro.",
    columns: ["Pedido", "Fornecedor", "Data", "Valor", "Situação"],
    rows: [
      ["#308", "Distribuidora Norte", "14/08", "R$ 6.480,00", { label: "Recebido", tone: "success" as BadgeTone }],
      ["#307", "Elétrica Sul", "11/08", "R$ 2.115,00", { label: "Em cotação", tone: "warning" as BadgeTone }],
      ["#306", "Distribuidora Norte", "05/08", "R$ 4.020,00", { label: "Recebido", tone: "success" as BadgeTone }],
    ],
  },
  {
    id: "estoque",
    icon: Boxes,
    label: "Estoque",
    pageTitle: "Estoque",
    subtitle: "Saldo por depósito, sempre atualizado.",
    newLabel: "Nova movimentação",
    narration:
      "O estoque se move sozinho. Comprou e recebeu, o produto entra. Confirmou a venda, o produto sai. E quando o saldo fica abaixo do mínimo, o sistema avisa antes de faltar material para atender o cliente.",
    columns: ["Produto", "Depósito", "Saldo", "Situação"],
    rows: [
      ["Cabo elétrico 2,5mm", "Depósito Central", "420 m", { label: "OK", tone: "success" as BadgeTone }],
      ["Disjuntor 20A", "Depósito Central", "8 un", { label: "Abaixo do mínimo", tone: "danger" as BadgeTone }],
      ["Luminária LED 40W", "Filial Norte", "132 un", { label: "OK", tone: "success" as BadgeTone }],
    ],
  },
  {
    id: "vendas",
    icon: ShoppingCart,
    label: "Vendas",
    pageTitle: "Vendas",
    subtitle: "Orçamentos, pedidos e vendas da sua empresa.",
    newLabel: "Novo pedido",
    narration:
      "Nas vendas o orçamento vira pedido e o pedido vira venda, sem redigitar nada. Ao confirmar, o material sai do estoque e o título a receber é criado no financeiro na mesma hora.",
    columns: ["Pedido", "Cliente", "Data", "Valor", "Situação"],
    rows: [
      ["#1042", "Comércio Silva Ltda", "12/08", "R$ 3.240,00", { label: "Faturado", tone: "success" as BadgeTone }],
      ["#1041", "Construtora Alfa", "10/08", "R$ 1.890,00", { label: "Em aberto", tone: "warning" as BadgeTone }],
      ["#1040", "Mercado Central", "08/08", "R$ 970,00", { label: "Faturado", tone: "success" as BadgeTone }],
    ],
  },
  {
    id: "financeiro",
    icon: Banknote,
    label: "Financeiro",
    pageTitle: "Contas a pagar e a receber",
    subtitle: "Lançamentos financeiros da sua empresa.",
    newLabel: "Novo lançamento",
    narration:
      "O financeiro recebe tudo pronto: os títulos a pagar e a receber nascem das compras e das vendas, com o vencimento em dia. E o gráfico de fluxo de caixa mostra receita e despesa mês a mês, para você enxergar o resultado sem montar planilha.",
    columns: ["Descrição", "Vencimento", "Valor", "Situação"],
    rows: [
      ["Recebimento — Comércio Silva", "22/08", "R$ 2.100,00", { label: "A vencer", tone: "warning" as BadgeTone }],
      ["Pagamento — Distribuidora Norte", "24/08", "R$ 3.400,00", { label: "A vencer", tone: "warning" as BadgeTone }],
      ["Recebimento — Mercado Central", "10/08", "R$ 1.560,00", { label: "Pago", tone: "success" as BadgeTone }],
    ],
    hasDashboard: true,
  },
  {
    id: "producao",
    icon: Factory,
    label: "Produção",
    pageTitle: "Ordens de produção",
    subtitle: "Acompanhamento do que está sendo produzido.",
    newLabel: "Nova ordem",
    narration:
      "Para quem fabrica, o módulo de produção abre a ordem, consome o material do estoque e acompanha cada etapa até o produto ficar pronto para a venda.",
    columns: ["Ordem", "Produto", "Quantidade", "Situação"],
    rows: [
      ["OP-215", "Luminária LED 40W", "150 un", { label: "Em produção", tone: "warning" as BadgeTone }],
      ["OP-214", "Chicote elétrico", "80 un", { label: "Concluída", tone: "success" as BadgeTone }],
      ["OP-213", "Painel de comando", "12 un", { label: "Concluída", tone: "success" as BadgeTone }],
    ],
  },
  {
    id: "rh",
    icon: UserCog,
    label: "Recursos Humanos",
    pageTitle: "Colaboradores",
    subtitle: "Cadastro e situação de cada colaborador.",
    newLabel: "Novo colaborador",
    narration:
      "O módulo de recursos humanos guarda função, cargo, salário, horário e setor de cada colaborador. Também controla exames médicos, entrega de equipamento de proteção, férias e até os aniversariantes do mês.",
    columns: ["Colaborador", "Cargo", "Setor", "Situação"],
    rows: [
      ["Ana Ribeiro", "Vendedora", "Comercial", { label: "Ativo", tone: "success" as BadgeTone }],
      ["Carlos Menezes", "Analista Financeiro", "Financeiro", { label: "Férias", tone: "neutral" as BadgeTone }],
      ["Juliana Prado", "Auxiliar de Estoque", "Logística", { label: "Experiência", tone: "warning" as BadgeTone }],
    ],
  },
  {
    id: "folha",
    icon: Clock,
    label: "Ponto e Folha",
    pageTitle: "Ponto e folha de pagamento",
    subtitle: "Marcações, banco de horas e holerite.",
    newLabel: "Calcular folha",
    narration:
      "Ponto e folha é o diferencial do AlePejo. O sistema controla as marcações, soma as horas positivas e negativas do mês e leva o saldo direto para o cálculo da folha. O que não foi compensado entra como hora extra, e o holerite sai pronto.",
    columns: ["Colaborador", "Horas no mês", "Saldo", "Situação"],
    rows: [
      ["Ana Ribeiro", "176h", "+ 4h20", { label: "Hora extra", tone: "warning" as BadgeTone }],
      ["Carlos Menezes", "176h", "0h00", { label: "Em dia", tone: "success" as BadgeTone }],
      ["Juliana Prado", "168h", "- 2h10", { label: "A compensar", tone: "neutral" as BadgeTone }],
    ],
  },
  {
    id: "administracao",
    icon: ShieldCheck,
    label: "Administração",
    pageTitle: "Usuários e perfis de acesso",
    subtitle: "Quem entra no sistema e o que cada um pode fazer.",
    newLabel: "Novo usuário",
    narration:
      "Por fim, a administração fica com você. Usuários ilimitados, cada um com um perfil que define exatamente o que pode ver e fazer. E na personalização você coloca a sua logo, o nome da sua empresa e escolhe o tema — o sistema fica com a cara do seu negócio.",
    columns: ["Usuário", "Perfil de acesso", "Situação"],
    rows: [
      ["Ana Ribeiro", "Vendas", { label: "Ativo", tone: "success" as BadgeTone }],
      ["Carlos Menezes", "Financeiro", { label: "Ativo", tone: "success" as BadgeTone }],
      ["Juliana Prado", "Estoque", { label: "Ativo", tone: "success" as BadgeTone }],
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
              width={35}
              height={22}
              className="h-[22px] w-auto object-contain"
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
            width={35}
            height={22}
            className="h-[22px] w-auto object-contain"
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
        className="aurora-bg pointer-events-none absolute inset-x-0 -top-1/3 h-[140%] opacity-[0.16]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:pt-24">
        <div>
          <span className="glass-panel inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm">
            <Sparkles size={12} className="text-[var(--primary)]" />
            Feito para pequenas empresas
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-[var(--text-primary)] md:text-6xl">
            Sua empresa organizada,{" "}
            <span className="aurora-text">num só sistema</span>
          </h1>

          <p className="mt-5 max-w-lg text-lg text-[var(--text-muted)]">
            Cadastros, vendas, compras, estoque, financeiro, produção e RH —
            tudo integrado, na nuvem. Comece em minutos, com {trialDays} dia
            {trialDays === 1 ? "" : "s"} grátis.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/planos"
              className="aurora-banner rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:rgb(37_99_235_/_0.35)] transition-transform hover:scale-[1.03]"
            >
              Começar teste grátis de {trialDays} dia
              {trialDays === 1 ? "" : "s"}
            </Link>

            <a
              href="#demonstracao"
              className="glass-panel rounded-xl px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-white/70"
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
          <div className="rounded-3xl shadow-2xl shadow-[color:rgb(37_99_235_/_0.25)]">
            <DashboardPreview />
          </div>
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
    icon: ClipboardCheck,
    title: "Inventário",
    items: [
      "Contagem de inventário, com recontagem em rodadas",
      "Acompanhamento de inventário",
      "Dashboard do último inventário",
    ],
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
              <span className="inline-flex rounded-xl aurora-icon-badge p-3">
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
                <span className="inline-flex rounded-lg aurora-icon-badge p-2">
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
                <span className="inline-flex rounded-lg aurora-icon-badge p-2">
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
              <span className="inline-flex shrink-0 rounded-xl aurora-icon-badge p-2.5">
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
              <span className="inline-flex rounded-xl aurora-icon-badge p-3">
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
        <div className="aurora-banner relative overflow-hidden rounded-3xl px-6 py-12 text-center shadow-2xl shadow-[color:rgb(124_58_237_/_0.3)] sm:px-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          />

          <span className="glass-panel relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white">
            <CalendarClock size={13} />
            Demonstração personalizada
          </span>

          <h2 className="relative mt-4 text-3xl font-bold text-white">
            Agende agora mesmo uma demonstração do Sistema AlePejo
          </h2>

          <p className="relative mx-auto mt-3 max-w-xl text-white/85">
            Nossa equipe vai te mostrar na prática como o sistema pode
            ajudar sua empresa a organizar informações e simplificar a
            gestão.
          </p>

          <div className="relative mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {demoBullets.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white"
              >
                <item.icon size={16} className="shrink-0" />
                {item.label}
              </div>
            ))}
          </div>

          <a
            href="#contato"
            className="relative mt-8 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#4f46e5] shadow-lg transition-transform hover:scale-[1.03]"
          >
            Agendar demonstração
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * Tempo que cada parada fica no ar quando a narração está no mudo.
 * Calculado pelo tamanho do texto (~2,6 palavras por segundo, ritmo de
 * locução em português) pra a legenda não sumir antes de dar pra ler.
 */
function stepDuration(narration: string) {
  const words = narration.trim().split(/\s+/).length;

  return Math.max(7000, Math.round((words / 2.6) * 1000) + 900);
}

/**
 * Vozes em português que os navegadores costumam ter, separadas por
 * gênero pra pontuar a favor da masculina. As do Edge marcadas como
 * "Natural"/"Online" são neurais e soam bem melhor que a voz robótica
 * antiga do Windows — por isso valem pontos extras.
 */
const FEMALE_PT_VOICES = [
  "francisca",
  "thalita",
  "brenda",
  "elza",
  "giovanna",
  "leila",
  "leticia",
  "letícia",
  "manuela",
  "yara",
  "maria",
  "luciana",
  "joana",
  "camila",
  "vitoria",
  "vitória",
  "helena",
];

const MALE_PT_VOICES = [
  "daniel",
  "antonio",
  "antônio",
  "fabio",
  "fábio",
  "julio",
  "júlio",
  "nicolau",
  "valerio",
  "valério",
  "donato",
  "humberto",
  "duarte",
  "felipe",
];

/**
 * Escolhe a melhor voz disponível: em português, masculina e o mais
 * natural possível. Cada navegador tem um conjunto diferente, então em
 * vez de fixar um nome a gente pontua e fica com a melhor colocada.
 */
function pickVoice(voices: SpeechSynthesisVoice[]) {
  const candidates = voices.filter((v) =>
    v.lang?.toLowerCase().startsWith("pt")
  );

  if (candidates.length === 0) {
    return null;
  }

  function score(voice: SpeechSynthesisVoice) {
    const name = voice.name.toLowerCase();
    let points = 0;

    if (MALE_PT_VOICES.some((n) => name.includes(n))) {
      points += 60;
    }

    if (FEMALE_PT_VOICES.some((n) => name.includes(n))) {
      points -= 60;
    }

    // Neurais do Edge — as mais naturais que aparecem no navegador.
    if (name.includes("natural") || name.includes("online")) {
      points += 60;
    }

    /*
     * A voz do Google em pt-BR é a mesma do navegador de mapas: todo
     * mundo já ouviu, e no mascote soa como GPS, não como personagem.
     * Fica por último entre as masculinas — se houver qualquer outra,
     * ela ganha; se for a única do navegador, ainda assim é usada.
     */
    if (name.includes("google")) {
      points -= 25;
    }

    if (voice.lang.toLowerCase().replace("_", "-") === "pt-br") {
      points += 20;
    }

    if (voice.localService) {
      points += 2;
    }

    return points;
  }

  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

/**
 * As vozes chegam de forma assíncrona no Chrome: na primeira chamada
 * `getVoices()` volta vazio e só depois o evento `voiceschanged`
 * avisa. Sem esperar por ele, o tour começaria com a voz padrão do
 * sistema (em inglês) em vez da masculina em português.
 */
function useSpeechVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    function refresh() {
      setVoices(window.speechSynthesis.getVoices());
    }

    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
    };
  }, []);

  return voices;
}

/**
 * Demonstração guiada — o "vídeo" do sistema, montado com as próprias
 * telas em vez de um arquivo gravado: passa módulo por módulo sozinho,
 * mostra a tela de cada um e conta o que ele faz.
 *
 * A voz sai do próprio navegador (Web Speech API, pt-BR). É o único
 * jeito de ter narração sem hospedar áudio, e tem uma vantagem real:
 * quando o texto de um módulo mudar, a narração muda junto — não fica
 * um vídeo velho contando o sistema errado. Onde a API não existe (ou
 * não tem voz em português), o tour roda igual, só sem som.
 *
 * Começa parado de propósito: navegador nenhum deixa um site falar
 * sem o visitante clicar antes, e som automático espantaria mais gente
 * do que convenceria.
 */
function DemoTour() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(true);
  const [started, setStarted] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);

  const [pointing, setPointing] = useState(false);
  const [reaction, setReaction] = useState<MascoteMood | null>(null);

  const step = demoTabs[index];
  const voices = useSpeechVoices();
  const voice = pickVoice(voices);

  useEffect(() => {
    setCanSpeak(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

  // Uma parada por vez: fala (ou conta o tempo) e avança sozinho. O
  // cleanup corta a fala pendente — sem ele, pausar ou trocar de
  // módulo deixaria a voz anterior terminando por cima da nova.
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
      // Ritmo normal de fala: abaixo disso a leitura fica arrastada.
      utterance.rate = 1.04;
      // Tom neutro: numa voz masculina, forçar pra cima (como se fazia
      // com a feminina) soa artificial — natural é ficar perto de 1.
      utterance.pitch = 1.0;
      utterance.onend = advance;
      // Se a fala falhar (aba sem permissão, voz indisponível), o tour
      // não pode travar parado nesse módulo pra sempre.
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

  // Sair da página falando seria constrangedor pro visitante.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Ao entrar em cada módulo o Pejo aponta pra tela por um instante, e
  // depois volta a só flutuar — apontar o tempo todo vira estátua.
  useEffect(() => {
    if (!playing) {
      setPointing(false);

      return;
    }

    setPointing(true);
    const timer = setTimeout(() => setPointing(false), 1800);

    return () => clearTimeout(timer);
  }, [playing, index]);

  // Reação a um clique do visitante: dura o tempo da animação e some.
  useEffect(() => {
    if (!reaction) {
      return;
    }

    const timer = setTimeout(() => setReaction(null), 1900);

    return () => clearTimeout(timer);
  }, [reaction]);

  function play() {
    setStarted(true);
    setPlaying(true);
  }

  function goTo(next: number) {
    setIndex(next);
    setStarted(true);
  }

  const finished = started && !playing && index === demoTabs.length - 1;

  /**
   * O humor do Pejo é o estado do tour traduzido em cara e corpo:
   * acena antes de começar, aponta ao abrir cada módulo, murcha quando
   * pausam e comemora no fim. Um clique do visitante passa na frente
   * de tudo — é a parte em que ele interage com quem está olhando.
   */
  const mood: MascoteMood = reaction
    ? reaction
    : !started
      ? "wave"
      : finished
        ? "happy"
        : !playing
          ? "sad"
          : pointing
            ? "point"
            : "idle";

  /** Clique no mascote — vai revezando as reações pra não cansar. */
  function reactToClick() {
    const reactions: MascoteMood[] = ["wave", "spin", "happy"];
    const current = reactions.indexOf(reaction ?? "happy");

    setReaction(reactions[(current + 1) % reactions.length]);
  }

  return (
    <section id="demonstracao" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <PlayCircle size={13} className="text-[var(--primary)]" />
            Demonstração guiada
          </span>

          <h2 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">
            Veja o sistema funcionando, módulo por módulo
          </h2>

          <p className="mt-3 text-[var(--text-muted)]">
            Aperte o play e deixe o Pejo, nosso assistente, te levar
            módulo por módulo, explicando em voz alta o que cada um
            faz. Dados de exemplo, só pra ilustrar.
          </p>
        </div>

        <div className="mx-auto mt-10 flex flex-wrap justify-center gap-2">
          {demoTabs.map((t, position) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTo(position)}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                position === index
                  ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative mx-auto mt-8">
          <AppPreview
            activeId={step.id}
            onSelect={(id) =>
              goTo(demoTabs.findIndex((t) => t.id === id))
            }
            interactive
          />

          {!started && (
            <button
              type="button"
              onClick={play}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-[color:rgb(9_13_25_/_0.55)] backdrop-blur-[2px] transition-colors hover:bg-[color:rgb(9_13_25_/_0.62)]"
            >
              <Mascote mood="wave" className="h-auto w-[110px] sm:w-[150px]" />

              <span className="aurora-banner flex h-16 w-16 items-center justify-center rounded-full text-white shadow-2xl">
                <Play size={26} className="ml-1" fill="currentColor" />
              </span>

              <span className="text-lg font-semibold text-white">
                Assistir à demonstração com o Pejo
              </span>

              <span className="text-sm text-white/80">
                {demoTabs.length} módulos · cerca de 3 minutos
                {canSpeak ? " · com narração" : ""}
              </span>
            </button>
          )}
        </div>

        {/* Legenda + controles: a narração também vem escrita, pra quem
            assiste no mudo, no trabalho ou não ouve. */}
        <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
              <div
                className="aurora-banner h-full rounded-full transition-all duration-500"
                style={{
                  width: `${((index + 1) / demoTabs.length) * 100}%`,
                }}
              />
            </div>

            <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">
              {index + 1} de {demoTabs.length}
            </span>
          </div>

          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <div className="flex shrink-0 flex-col items-center">
              <Mascote
                mood={mood}
                speaking={playing && sound && canSpeak}
                onClick={reactToClick}
                className="h-auto w-[92px] sm:w-[104px]"
              />

              <button
                type="button"
                onClick={reactToClick}
                className="mt-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
              >
                Clique no Pejo
              </button>
            </div>

            {/* Balão de fala: a pontinha à esquerda liga o texto ao
                mascote, deixando claro que a voz é dele. */}
            <div className="relative min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <span
                aria-hidden
                className="absolute -left-[7px] top-8 hidden h-3 w-3 rotate-45 border-b border-l border-[var(--border)] bg-[var(--background)] sm:block"
              />

              <div className="flex items-center gap-2">
                <span className="aurora-icon-badge flex h-7 w-7 items-center justify-center rounded-lg">
                  <step.icon size={15} />
                </span>

                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {step.label}
                </p>
              </div>

              <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
                {step.narration}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
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
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
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
              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] disabled:opacity-40"
            >
              Anterior
            </button>

            <button
              type="button"
              disabled={index === demoTabs.length - 1}
              onClick={() => goTo(index + 1)}
              className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] disabled:opacity-40"
            >
              Próximo
            </button>

            {canSpeak && (
              <button
                type="button"
                onClick={() => setSound(!sound)}
                className="ml-auto flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
              >
                {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {sound ? "Som ligado" : "Som desligado"}
              </button>
            )}
          </div>
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
          className="aurora-banner mt-8 inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[color:rgb(37_99_235_/_0.35)] transition-transform hover:scale-[1.03]"
        >
          Ver planos e preços
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  const visits = useVisitCounter();

  return (
    <footer className="border-t border-[var(--border)] py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-[var(--text-muted)]">
        <p>
          © {new Date().getFullYear()} AlePejo Assessoria e Prestação de
          Serviço Ltda.
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
            className="font-medium hover:text-[var(--text-primary)] hover:underline"
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
    <div className="min-h-screen bg-[var(--background)]">
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
