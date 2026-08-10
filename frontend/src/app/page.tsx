"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Package,
  PiggyBank,
  Users,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components";
import { DashboardHeader } from "@/components/dashboard";

import { useAuth } from "@/providers/AuthProvider";
import { partnerService } from "@/services/partner.service";
import { productService } from "@/services/product.service";
import { inventoryService } from "@/services/inventory.service";
import { financialEntryService } from "@/services/financial-entry.service";
import {
  employeeReportsService,
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
  const [recebidoTotal, setRecebidoTotal] = useState<
    number | null
  >(null);
  const [pagoTotal, setPagoTotal] = useState<number | null>(
    null
  );
  const [cashFlowLoading, setCashFlowLoading] =
    useState(true);

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

  useEffect(() => {
    Promise.all([
      partnerService.list({ limit: 1 }),
      partnerService.list({ limit: 1, role: "CUSTOMER" }),
      productService.list({ limit: 1 }),
      inventoryService.list({ limit: 1 }),
    ])
      .then(([todos, clientes, prods, estoque]) => {
        setPartners(todos.total);
        setCustomers(clientes.total);
        setProducts(prods.total);
        setInventoryItems(estoque.total);
      })
      .catch(() => {
        // Sem dados: os cartões mostram "—" em vez de quebrar a tela.
      })
      .finally(() => setLoading(false));

    const now = new Date();

    financialEntryService
      .getCashFlow(now.getFullYear())
      .then((cashFlow) => {
        const mesAtual = cashFlow.months[now.getMonth()];

        setAReceberMes(
          mesAtual.receivable.open +
            mesAtual.receivable.overdue
        );

        setAPagarMes(
          mesAtual.payable.open + mesAtual.payable.overdue
        );

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
      })
      .catch(() => {
        // Sem licença do Financeiro ou sem dados: cartão mostra "—".
      })
      .finally(() => setCashFlowLoading(false));

    const daqui30Dias = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    Promise.all([
      employeeReportsService.getIndicators(),
      employeeReportsService.getBirthdays(now.getMonth() + 1),
      employeeService.list({ limit: 100 }),
    ])
      .then(([indicators, birthdays, colaboradores]) => {
        setColaboradoresAtivos(
          indicators.byStatus.find((s) => s.status === "ATIVO")
            ?.count ?? 0
        );

        setColaboradoresExperiencia(
          indicators.byStatus.find(
            (s) => s.status === "EXPERIENCIA"
          )?.count ?? 0
        );

        setBirthdaysMes(birthdays);
        setColaboradoresList(colaboradores);

        setExamesAVencer(
          colaboradores.filter(
            (c) =>
              c.nextExamDate &&
              new Date(c.nextExamDate) <= daqui30Dias
          ).length
        );
      })
      .catch(() => {
        // Sem licença do RH ou sem dados: cartão mostra "—".
      })
      .finally(() => setHrLoading(false));
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

  return (
    <AppShell workspaceLabel="Visão geral">
      <div className="space-y-8">
        <DashboardHeader
          userName={user?.name?.split(" ")[0]}
          companyName={user?.company?.tradeName}
          isBirthday={isUserBirthday}
        />

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
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
            hint="Produtos com saldo cadastrado por depósito"
            icon={Boxes}
            href="/erp/estoque"
            loading={loading}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
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

            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Valores em aberto do mês atual, calculados a
              partir de Contas a Receber e a Pagar.
            </p>
          </div>

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

            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Realizado no ano até o mês atual, a partir das
              baixas em Contas a Receber e a Pagar.
            </p>
          </div>

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
              (inclui atrasados).
            </p>
          </div>
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
