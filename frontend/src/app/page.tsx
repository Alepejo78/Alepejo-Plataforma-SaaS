"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Package,
  Users,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components";
import { DashboardHeader } from "@/components/dashboard";

import { useAuth } from "@/providers/AuthProvider";
import { partnerService } from "@/services/partner.service";
import { productService } from "@/services/product.service";

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
  const [loading, setLoading] = useState(true);

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
  }, []);

  return (
    <AppShell workspaceLabel="Visão geral">
      <div className="space-y-8">
        <DashboardHeader
          userName={user?.name?.split(" ")[0]}
          companyName={user?.company?.tradeName}
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
            value="—"
            hint="Disponível após o módulo de estoque"
            icon={Boxes}
            loading={false}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Wallet
                size={18}
                className="text-[var(--text-secondary)]"
              />

              <h2 className="font-semibold text-[var(--text-primary)]">
                Fluxo de caixa
              </h2>
            </div>

            <div className="space-y-3">
              {[
                { label: "A receber no mês", value: 0 },
                { label: "A pagar no mês", value: 0 },
                { label: "Saldo previsto", value: 0 },
              ].map((linha) => (
                <div
                  key={linha.label}
                  className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0"
                >
                  <span className="text-sm text-[var(--text-secondary)]">
                    {linha.label}
                  </span>

                  <span className="font-medium text-[var(--text-primary)]">
                    {money(linha.value)}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Os valores serão preenchidos quando o módulo
              Financeiro estiver disponível.
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
                { label: "Ativos", value: "—" },
                { label: "Em experiência", value: "—" },
                { label: "Aniversariantes do mês", value: "—" },
                { label: "Exames a vencer", value: "—" },
              ].map((linha) => (
                <div
                  key={linha.label}
                  className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0"
                >
                  <span className="text-sm text-[var(--text-secondary)]">
                    {linha.label}
                  </span>

                  <span className="font-medium text-[var(--text-primary)]">
                    {linha.value}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Os valores serão preenchidos quando o módulo
              de RH estiver disponível.
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
