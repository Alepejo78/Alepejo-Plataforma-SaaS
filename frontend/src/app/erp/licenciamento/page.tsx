"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

import { OsShell } from "@/components";

import {
  licenseService,
  type MyLicense,
} from "@/services/license.service";

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

export default function LicenciamentoPage() {
  const [license, setLicense] = useState<MyLicense | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    licenseService
      .me()
      .then((data) => {
        if (active) {
          setLicense(data);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Não foi possível carregar as informações de licenciamento."
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <OsShell workspaceLabel="Licenciamento">
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Licenciamento
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Plano contratado e módulos disponíveis para sua
            empresa.
          </p>
        </header>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {!loading && !error && license && (
          <>
            <section className="rounded-2xl border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)]">
                Plano atual
              </h2>

              {license.companyPlan ? (
                <div className="mt-2">
                  <p className="text-xl font-semibold text-[var(--text-primary)]">
                    {license.companyPlan.plan.name}
                  </p>

                  {license.companyPlan.plan.description && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {license.companyPlan.plan.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-6 text-sm text-[var(--text-muted)]">
                    <span>
                      Início:{" "}
                      {formatDate(
                        license.companyPlan.startedAt
                      ) ?? "—"}
                    </span>

                    <span>
                      Expira em:{" "}
                      {formatDate(
                        license.companyPlan.expiresAt
                      ) ?? "sem data de expiração"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[var(--text-muted)]">
                  Nenhum plano contratado.
                </p>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium text-[var(--text-muted)]">
                Módulos habilitados
              </h2>

              {license.companyModules.length === 0 ? (
                <p className="text-[var(--text-muted)]">
                  Nenhum módulo habilitado individualmente.
                  O acesso vem do plano contratado.
                </p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {license.companyModules.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-2xl border border-[var(--border)] p-4"
                    >
                      {item.trial ? (
                        <Clock
                          size={18}
                          className="mt-0.5 shrink-0 text-[var(--warning)]"
                        />
                      ) : (
                        <CheckCircle2
                          size={18}
                          className="mt-0.5 shrink-0 text-[var(--success)]"
                        />
                      )}

                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text-primary)]">
                          {item.module.name}
                        </p>

                        <p className="text-sm text-[var(--text-muted)]">
                          {item.trial
                            ? "Período de avaliação"
                            : "Ativo"}

                          {item.expiresAt &&
                            ` · até ${formatDate(
                              item.expiresAt
                            )}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </OsShell>
  );
}
