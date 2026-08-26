"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  Package,
  PiggyBank,
  Receipt,
  UsersRound,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components";
import { DashboardHeader } from "@/components/dashboard";

import { useAuth } from "@/providers/AuthProvider";
import { partnerService } from "@/services/partner.service";
import { productService } from "@/services/product.service";
import {
  dashboardService,
  type DashboardAccountBreakdownRow,
  type DashboardCompanySummary,
  type DashboardGenderRow,
  type DashboardSectorRow,
} from "@/services/dashboard.service";
import type { CashFlowMonth } from "@/services/financial-entry.service";
import {
  employeeService,
  type Employee,
  type EmployeeBirthday,
} from "@/services/hr.service";

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Versão curta pro eixo do gráfico ("R$ 1,2 mil") — número cheio ali vira sopa de dígito. */
function moneyCompact(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

const MONTH_LABELS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const GENDER_LABELS: Record<string, string> = {
  MASCULINO: "Homens",
  FEMININO: "Mulheres",
  OUTRO: "Outro",
};

/** Cores fixas por gênero (não dependem da ordem que a API devolve). */
const GENDER_COLORS: Record<string, string> = {
  MASCULINO: "var(--primary)",
  FEMININO: "#d6336c",
  OUTRO: "var(--text-muted)",
};

/** Paleta pra "por setor" — quantidade de setores varia por empresa, então roda em ciclo. */
const SECTOR_COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "#d6336c",
  "#7c3aed",
  "#0891b2",
  "var(--danger)",
];

const dashboardTooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 12,
};

interface CardProps {
  title: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  href,
  loading,
}: CardProps) {
  const content = (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-start justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {title}
        </p>

        <span className="rounded-xl border border-[var(--border)] p-2 text-[var(--text-secondary)]">
          <Icon size={18} />
        </span>
      </div>

      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-[var(--surface-hover)]" />
      ) : (
        <p className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
          {value}
        </p>
      )}

      {hint && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function HomePage() {
  const { user } = useAuth();

  const [partners, setPartners] = useState<number | null>(
    null
  );
  const [customers, setCustomers] = useState<number | null>(
    null
  );
  const [products, setProducts] = useState<number | null>(
    null
  );
  const [inventoryItems, setInventoryItems] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);

  const [aReceberMes, setAReceberMes] = useState<
    number | null
  >(null);
  const [aPagarMes, setAPagarMes] = useState<number | null>(
    null
  );
  // Parte do "a receber"/"a pagar" do mês que já venceu — mostrada
  // destacada dentro da própria barra, não só no total.
  const [aReceberVencido, setAReceberVencido] = useState(0);
  const [aPagarVencido, setAPagarVencido] = useState(0);
  const [recebidoTotal, setRecebidoTotal] = useState<
    number | null
  >(null);
  const [pagoTotal, setPagoTotal] = useState<number | null>(
    null
  );
  const [cashFlowLoading, setCashFlowLoading] =
    useState(true);
  const [cashFlowMonths, setCashFlowMonths] = useState<
    CashFlowMonth[]
  >([]);

  const [colaboradoresAtivos, setColaboradoresAtivos] =
    useState<number | null>(null);
  const [colaboradoresExperiencia, setColaboradoresExperiencia] =
    useState<number | null>(null);
  const [birthdaysMes, setBirthdaysMes] = useState<
    EmployeeBirthday[]
  >([]);
  const [examesAVencer, setExamesAVencer] = useState<
    number | null
  >(null);
  const [hrLoading, setHrLoading] = useState(true);
  const [colaboradoresList, setColaboradoresList] = useState<
    Employee[]
  >([]);
  const [isUserBirthday, setIsUserBirthday] = useState(false);

  // Quem administra um grupo com mais de uma empresa vê a soma de
  // todas (o backend decide isso sozinho, por permissão); esse rótulo
  // só existe pra deixar claro NA TELA que o número é consolidado, em
  // vez da pessoa achar que é só da empresa que está vendo agora.
  const [consolidated, setConsolidated] = useState(false);
  const [dashboardCompanies, setDashboardCompanies] = useState<
    DashboardCompanySummary[]
  >([]);
  const [despesasPorTipo, setDespesasPorTipo] = useState<
    DashboardAccountBreakdownRow[]
  >([]);
  const [receitasPorTipo, setReceitasPorTipo] = useState<
    DashboardAccountBreakdownRow[]
  >([]);
  const [employeesByGender, setEmployeesByGender] = useState<
    DashboardGenderRow[]
  >([]);
  const [employeesBySector, setEmployeesBySector] = useState<
    DashboardSectorRow[]
  >([]);

  useEffect(() => {
    Promise.all([
      partnerService.list({ limit: 1 }),
      partnerService.list({ limit: 1, role: "CUSTOMER" }),
      productService.list({ limit: 1 }),
    ])
      .then(([todos, clientes, prods]) => {
        setPartners(todos.total);
        setCustomers(clientes.total);
        setProducts(prods.total);
      })
      .catch(() => {
        // Sem dados: os cartões mostram "—" em vez de quebrar a tela.
      })
      .finally(() => setLoading(false));

    const now = new Date();

    dashboardService
      .getOverview(now.getFullYear())
      .then((overview) => {
        setConsolidated(overview.consolidated);
        setDashboardCompanies(overview.companies);
        setInventoryItems(overview.inventoryItems);
        setDespesasPorTipo(overview.despesasPorTipo);
        setReceitasPorTipo(overview.receitasPorTipo);

        const cashFlow = overview.cashFlow;

        setCashFlowMonths(cashFlow.months);

        const mesAtual = cashFlow.months[now.getMonth()];

        setAReceberMes(
          mesAtual.receivable.open +
            mesAtual.receivable.overdue
        );

        setAPagarMes(
          mesAtual.payable.open + mesAtual.payable.overdue
        );

        setAReceberVencido(mesAtual.receivable.overdue);
        setAPagarVencido(mesAtual.payable.overdue);

        // Realizado no ano até o mês atual (o que já entrou/saiu de
        // fato, diferente do "a receber/a pagar" que é o pendente).
        const mesesDoAno = cashFlow.months.slice(
          0,
          now.getMonth() + 1
        );

        setRecebidoTotal(
          mesesDoAno.reduce(
            (soma, mes) => soma + mes.receivable.settled,
            0
          )
        );

        setPagoTotal(
          mesesDoAno.reduce(
            (soma, mes) => soma + mes.payable.settled,
            0
          )
        );

        if (overview.hrAvailable) {
          setColaboradoresAtivos(overview.employeesAtivos);
          setColaboradoresExperiencia(
            overview.employeesExperiencia
          );
          setBirthdaysMes(overview.birthdaysMes);
          setExamesAVencer(overview.examesAVencer);
          setEmployeesByGender(overview.employeesByGender);
          setEmployeesBySector(overview.employeesBySector);
        }
      })
      .catch(() => {
        // Sem dados: os cartões mostram "—" em vez de quebrar a tela.
      })
      .finally(() => {
        setCashFlowLoading(false);
        setHrLoading(false);
      });

    // Só pra achar o próprio cadastro de colaborador e mostrar o
    // banner de aniversário — sempre da empresa em que a pessoa está
    // logada agora, mesmo quando os cartões acima estão consolidados.
    employeeService
      .list({ limit: 100 })
      .then(setColaboradoresList)
      .catch(() => {
        // Sem módulo de RH nesta empresa: sem banner de aniversário, e tudo bem.
      });
  }, []);

  useEffect(() => {
    if (!user?.email || colaboradoresList.length === 0) {
      return;
    }

    const meuCadastro = colaboradoresList.find(
      (c) =>
        c.email?.toLowerCase() === user.email.toLowerCase()
    );

    if (!meuCadastro?.birthDate) {
      return;
    }

    const nascimento = new Date(meuCadastro.birthDate);
    const hoje = new Date();

    setIsUserBirthday(
      nascimento.getUTCMonth() === hoje.getMonth() &&
        nascimento.getUTCDate() === hoje.getDate()
    );
  }, [user, colaboradoresList]);

  // Barra deitada "A receber x A pagar" do mês — duas linhas só, então
  // uma barra em pé desperdiçaria a largura do cartão. Cada barra é
  // empilhada em "em dia" + "vencido", pra mostrar quanto do total já
  // passou do vencimento sem precisar abrir Contas a Pagar/Receber.
  const aPagarReceberChart = [
    {
      label: "A receber",
      emDia: (aReceberMes ?? 0) - aReceberVencido,
      vencido: aReceberVencido,
      fill: "var(--success)",
    },
    {
      label: "A pagar",
      emDia: (aPagarMes ?? 0) - aPagarVencido,
      vencido: aPagarVencido,
      fill: "var(--danger)",
    },
  ];

  // Últimos 6 meses até o atual, incluindo o próprio — é a janela que
  // cabe legível num cartão pequeno sem virar risquinhos ilegíveis.
  const now = new Date();
  const tendenciaMeses = cashFlowMonths
    .slice(0, now.getMonth() + 1)
    .slice(-6)
    .map((mes) => ({
      mes: MONTH_LABELS_SHORT[mes.month - 1],
      recebido: mes.receivable.settled,
      pago: mes.payable.settled,
    }));

  // Gênero sem cadastro (null) some do gráfico — "sem informar" não
  // ajuda ninguém a ler a pizza, e o total das fatias já bate com
  // "Ativos" porque `byGender` só conta quem tem o campo preenchido.
  const genderChart = employeesByGender
    .filter((g) => g.gender)
    .map((g) => ({
      name: GENDER_LABELS[g.gender as string] ?? g.gender,
      value: g.count,
      fill: GENDER_COLORS[g.gender as string] ?? "var(--text-muted)",
    }));

  const sectorChart = employeesBySector.map((s, i) => ({
    name: s.sectorName,
    value: s.count,
    fill: SECTOR_COLORS[i % SECTOR_COLORS.length],
  }));

  return (
    <AppShell workspaceLabel="Visão geral">
      <div className="space-y-8">
        <DashboardHeader
          userName={user?.name?.split(" ")[0]}
          companyName={user?.company?.tradeName}
          isBirthday={isUserBirthday}
        />

        {consolidated && (
          <div
            title={dashboardCompanies
              .map((c) => c.tradeName)
              .join(", ")}
            className="-mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
          >
            <Building2 size={13} className="text-[var(--primary)]" />
            Visão consolidada de {dashboardCompanies.length}{" "}
            empresas do grupo
          </div>
        )}

        {/*
          Três linhas: A pagar/receber + despesas a pagar + despesas a
          receber na mesma linha (3 colunas), fluxo de caixa sozinho,
          e colaboradores ao lado do perfil dos colaboradores.
        */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Wallet
                  size={18}
                  className="text-[var(--text-secondary)]"
                />

                <h2 className="font-semibold text-[var(--text-primary)]">
                  A pagar/receber
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "A receber no mês",
                    value: aReceberMes,
                  },
                  { label: "A pagar no mês", value: aPagarMes },
                  {
                    label: "Saldo previsto",
                    value:
                      aReceberMes !== null && aPagarMes !== null
                        ? aReceberMes - aPagarMes
                        : null,
                  },
                ].map((linha) => (
                  <div
                    key={linha.label}
                    className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0"
                  >
                    <span className="text-sm text-[var(--text-secondary)]">
                      {linha.label}
                    </span>

                    {cashFlowLoading ? (
                      <span className="h-5 w-20 animate-pulse rounded bg-[var(--surface-hover)]" />
                    ) : (
                      <span className="font-medium text-[var(--text-primary)]">
                        {linha.value !== null
                          ? money(linha.value)
                          : "—"}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {!cashFlowLoading &&
                (aReceberMes || aPagarMes) && (
                  <div className="mt-4 h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={aPagarReceberChart}
                        margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="label"
                          stroke="var(--text-muted)"
                          fontSize={12}
                          width={70}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={dashboardTooltipStyle}
                          formatter={(v, name) => [money(Number(v)), name]}
                          cursor={{ fill: "var(--surface-hover)" }}
                        />
                        <Bar
                          dataKey="emDia"
                          name="Em aberto"
                          stackId="valor"
                          radius={[0, 0, 0, 0]}
                        >
                          {aPagarReceberChart.map((item) => (
                            <Cell key={item.label} fill={item.fill} />
                          ))}
                        </Bar>
                        <Bar
                          dataKey="vencido"
                          name="Vencido"
                          stackId="valor"
                          fill="var(--warning)"
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

              <p className="mt-4 text-xs text-[var(--text-muted)]">
                Valores em aberto do mês atual, calculados a
                partir de Contas a Receber e a Pagar
                {consolidated ? " de todas as empresas do grupo" : ""}.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Receipt
                  size={18}
                  className="text-[var(--text-secondary)]"
                />

                <h2 className="font-semibold text-[var(--text-primary)]">
                  Classificação de conta a pagar
                </h2>
              </div>

              {cashFlowLoading ? (
                <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
              ) : despesasPorTipo.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                  Nenhuma despesa lançada este ano ainda.
                </p>
              ) : (
                <div
                  style={{
                    height: Math.max(
                      160,
                      Math.min(despesasPorTipo.length, 6) * 40 + 30
                    ),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={despesasPorTipo.slice(0, 6)}
                      margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        stroke="var(--text-muted)"
                        fontSize={11}
                        tickFormatter={(v) => moneyCompact(Number(v))}
                      />
                      <YAxis
                        type="category"
                        dataKey="description"
                        stroke="var(--text-muted)"
                        fontSize={11}
                        width={110}
                      />
                      <Tooltip
                        contentStyle={dashboardTooltipStyle}
                        formatter={(v) => money(Number(v))}
                        cursor={{ fill: "var(--surface-hover)" }}
                      />
                      <Bar
                        dataKey="pago"
                        name="Pago"
                        stackId="despesa"
                        fill="var(--danger)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="emAberto"
                        name="Em aberto"
                        stackId="despesa"
                        fill="var(--warning)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <p className="mt-4 text-xs text-[var(--text-muted)]">
                As {Math.min(despesasPorTipo.length, 6)} maiores contas do
                plano de contas no ano{consolidated ? ", somando o grupo" : ""}.
                Veja todas em Financeiro → Gráficos de fluxo de caixa.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Receipt
                  size={18}
                  className="text-[var(--text-secondary)]"
                />

                <h2 className="font-semibold text-[var(--text-primary)]">
                  Classificação de conta a receber
                </h2>
              </div>

              {cashFlowLoading ? (
                <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
              ) : receitasPorTipo.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                  Nenhuma receita lançada este ano ainda.
                </p>
              ) : (
                <div
                  style={{
                    height: Math.max(
                      160,
                      Math.min(receitasPorTipo.length, 6) * 40 + 30
                    ),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={receitasPorTipo.slice(0, 6)}
                      margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        stroke="var(--text-muted)"
                        fontSize={11}
                        tickFormatter={(v) => moneyCompact(Number(v))}
                      />
                      <YAxis
                        type="category"
                        dataKey="description"
                        stroke="var(--text-muted)"
                        fontSize={11}
                        width={110}
                      />
                      <Tooltip
                        contentStyle={dashboardTooltipStyle}
                        formatter={(v) => money(Number(v))}
                        cursor={{ fill: "var(--surface-hover)" }}
                      />
                      <Bar
                        dataKey="pago"
                        name="Recebido"
                        stackId="receita"
                        fill="var(--success)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="emAberto"
                        name="Em aberto"
                        stackId="receita"
                        fill="var(--warning)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <p className="mt-4 text-xs text-[var(--text-muted)]">
                As {Math.min(receitasPorTipo.length, 6)} maiores contas do
                plano de contas no ano{consolidated ? ", somando o grupo" : ""}.
                Veja todas em Financeiro → Gráficos de fluxo de caixa.
              </p>
            </div>
        </section>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <PiggyBank
                  size={18}
                  className="text-[var(--text-secondary)]"
                />

                <h2 className="font-semibold text-[var(--text-primary)]">
                  Fluxo de caixa
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Recebido", value: recebidoTotal },
                  { label: "Pago", value: pagoTotal },
                  {
                    label: "Total em caixa",
                    value:
                      recebidoTotal !== null && pagoTotal !== null
                        ? recebidoTotal - pagoTotal
                        : null,
                  },
                ].map((linha) => (
                  <div
                    key={linha.label}
                    className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0"
                  >
                    <span className="text-sm text-[var(--text-secondary)]">
                      {linha.label}
                    </span>

                    {cashFlowLoading ? (
                      <span className="h-5 w-20 animate-pulse rounded bg-[var(--surface-hover)]" />
                    ) : (
                      <span className="font-medium text-[var(--text-primary)]">
                        {linha.value !== null
                          ? money(linha.value)
                          : "—"}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {!cashFlowLoading && tendenciaMeses.length > 1 && (
                <div className="mt-4 h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tendenciaMeses}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                      barGap={2}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="mes"
                        stroke="var(--text-muted)"
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--text-muted)"
                        fontSize={11}
                        width={44}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => moneyCompact(Number(v))}
                      />
                      <Tooltip
                        contentStyle={dashboardTooltipStyle}
                        formatter={(v) => money(Number(v))}
                      />
                      <Bar
                        dataKey="recebido"
                        name="Recebido"
                        fill="var(--success)"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="pago"
                        name="Pago"
                        fill="var(--danger)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <p className="mt-4 text-xs text-[var(--text-muted)]">
                Realizado no ano até o mês atual, a partir das
                baixas em Contas a Receber e a Pagar
                {consolidated ? " de todas as empresas do grupo" : ""}.
              </p>
            </div>

        <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users
                  size={18}
                  className="text-[var(--text-secondary)]"
                />

                <h2 className="font-semibold text-[var(--text-primary)]">
                  Colaboradores
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Ativos", value: colaboradoresAtivos },
                  {
                    label: "Em experiência",
                    value: colaboradoresExperiencia,
                  },
                  {
                    label: "Aniversariantes do mês",
                    value: birthdaysMes.length,
                  },
                ].map((linha) => (
                  <div
                    key={linha.label}
                    className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0"
                  >
                    <span className="text-sm text-[var(--text-secondary)]">
                      {linha.label}
                    </span>

                    {hrLoading ? (
                      <span className="h-5 w-8 animate-pulse rounded bg-[var(--surface-hover)]" />
                    ) : (
                      <span className="font-medium text-[var(--text-primary)]">
                        {linha.value !== null
                          ? String(linha.value)
                          : "—"}
                      </span>
                    )}
                  </div>
                ))}

                {!hrLoading && birthdaysMes.length > 0 && (
                  <div className="space-y-1.5 border-b border-[var(--border)] pb-2">
                    {birthdaysMes.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-[var(--text-secondary)]">
                          {b.name}
                        </span>

                        <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                          dia {b.day}
                          <span className="text-base leading-none">
                            🎉
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm text-[var(--text-secondary)]">
                    Exames a vencer
                  </span>

                  {hrLoading ? (
                    <span className="h-5 w-8 animate-pulse rounded bg-[var(--surface-hover)]" />
                  ) : (
                    <span className="font-medium text-[var(--text-primary)]">
                      {examesAVencer !== null
                        ? String(examesAVencer)
                        : "—"}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-4 text-xs text-[var(--text-muted)]">
                Exames com vencimento nos próximos 30 dias
                (inclui atrasados)
                {consolidated ? ", de todas as empresas do grupo" : ""}.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <UsersRound
                  size={18}
                  className="text-[var(--text-secondary)]"
                />

                <h2 className="font-semibold text-[var(--text-primary)]">
                  Perfil dos colaboradores
                </h2>
              </div>

              {hrLoading ? (
                <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
              ) : genderChart.length === 0 &&
                sectorChart.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                  Nenhum colaborador ativo cadastrado ainda.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-center text-xs font-medium text-[var(--text-muted)]">
                      Por gênero
                    </p>

                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={genderChart}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={28}
                            outerRadius={52}
                            paddingAngle={2}
                          >
                            {genderChart.map((item) => (
                              <Cell key={item.name} fill={item.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={dashboardTooltipStyle}
                            formatter={(v, name) => [
                              `${v} colaborador(es)`,
                              name,
                            ]}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 11 }}
                            iconSize={8}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-center text-xs font-medium text-[var(--text-muted)]">
                      Por setor
                    </p>

                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sectorChart}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={28}
                            outerRadius={52}
                            paddingAngle={2}
                          >
                            {sectorChart.map((item, i) => (
                              <Cell key={`${item.name}-${i}`} fill={item.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={dashboardTooltipStyle}
                            formatter={(v, name) => [
                              `${v} colaborador(es)`,
                              name,
                            ]}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 11 }}
                            iconSize={8}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs text-[var(--text-muted)]">
                Só colaboradores ativos, somando todas as empresas do grupo.
              </p>
            </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Parceiros"
            value={partners !== null ? String(partners) : "—"}
            hint="Clientes, fornecedores e demais"
            icon={Users}
            href="/erp/parceiros"
            loading={loading}
          />

          <StatCard
            title="Clientes"
            value={
              customers !== null ? String(customers) : "—"
            }
            hint="Parceiros com papel de cliente"
            icon={Users}
            href="/erp/parceiros"
            loading={loading}
          />

          <StatCard
            title="Produtos"
            value={products !== null ? String(products) : "—"}
            hint="Produtos e serviços cadastrados"
            icon={Package}
            href="/erp/produtos"
            loading={loading}
          />

          <StatCard
            title="Itens em estoque"
            value={
              inventoryItems !== null
                ? String(inventoryItems)
                : "—"
            }
            hint={
              consolidated
                ? "Saldo em todas as empresas do grupo"
                : "Produtos com saldo cadastrado por depósito"
            }
            icon={Boxes}
            href="/erp/estoque"
            loading={loading}
          />

          <StatCard
            title="Colaboradores"
            value={
              colaboradoresAtivos !== null
                ? String(colaboradoresAtivos)
                : "—"
            }
            hint="Ativos, somando o grupo"
            icon={UsersRound}
            href="/erp/rh"
            loading={hrLoading}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            {
              title: "Cadastrar parceiro",
              description:
                "Cliente, fornecedor, transportadora",
              href: "/erp/parceiros",
            },
            {
              title: "Cadastrar produto",
              description: "Produtos e serviços",
              href: "/erp/produtos",
            },
            {
              title: "Ver licenciamento",
              description: "Plano e módulos contratados",
              href: "/erp/licenciamento",
            },
          ].map((acao) => (
            <Link
              key={acao.href}
              href={acao.href}
              className="group flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--primary)]"
            >
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {acao.title}
                </p>

                <p className="text-sm text-[var(--text-muted)]">
                  {acao.description}
                </p>
              </div>

              <ArrowRight
                size={18}
                className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1"
              />
            </Link>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
