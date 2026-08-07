import Link from "next/link";
import { AppShell } from "@/components";

const modules = [
  {
    title: "Vendas",
    description: "Cadastro e consulta de vendas.",
    href: "/erp/vendas",
  },
  {
    title: "Clientes",
    description: "Clientes, fornecedores e demais parceiros.",
    href: "/erp/parceiros",
  },
  {
    title: "Orçamentos",
    description: "Em desenvolvimento.",
    href: "#",
  },
  {
    title: "Pedidos",
    description: "Em desenvolvimento.",
    href: "#",
  },
];

export default function Comercial() {
  return (
    <AppShell workspaceLabel="Comercial">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Comercial
          </h1>

          <p className="mt-2 text-[var(--text-muted)]">
            Central do módulo comercial.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <div
              key={module.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">
                {module.title}
              </h2>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {module.description}
              </p>

              {module.href === "#" ? (
                <button
                  disabled
                  className="mt-6 w-full rounded-lg bg-[var(--surface-active)] px-4 py-2 text-sm font-medium text-[var(--text-muted)]"
                >
                  Em breve
                </button>
              ) : (
                <Link
                  href={module.href}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  Acessar
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}