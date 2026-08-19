"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { maskDocument, onlyDigits } from "@/lib/masks";
import {
  companyOnboardingService,
  type PublicPlan,
} from "@/services/company-onboarding.service";
import {
  AddressFields,
  emptyAddress,
  type AddressFormState,
} from "@/components/company/AddressFields";
import { PaymentCheckout } from "@/components/billing/PaymentCheckout";
import { useAuth } from "@/providers/AuthProvider";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors
  focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

const emptyForm = {
  legalName: "",
  tradeName: "",
  personType: "COMPANY" as "COMPANY" | "INDIVIDUAL",
  document: "",
  email: "",
  phone: "",
  adminName: "",
  adminEmail: "",
};

function money(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function CadastroEmpresaForm() {
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId") ?? "";
  const payNow = searchParams.get("payNow") === "1";
  const moduleIds = (searchParams.get("modules") ?? "")
    .split(",")
    .filter(Boolean);

  const { refreshUser } = useAuth();

  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [planError, setPlanError] = useState(false);
  const [trialDays, setTrialDays] = useState(14);

  const [form, setForm] = useState(emptyForm);
  const [address, setAddress] = useState<AddressFormState>(emptyAddress);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isCompany = form.personType === "COMPANY";

  useEffect(() => {
    if (!planId) {
      return;
    }

    companyOnboardingService
      .listPublicPlans()
      .then((plans) => {
        const found = plans.find((p) => p.id === planId);

        if (found) {
          setPlan(found);
        } else {
          setPlanError(true);
        }
      })
      .catch(() => setPlanError(true));
  }, [planId]);

  useEffect(() => {
    companyOnboardingService
      .getPublicTrialDays()
      .then(setTrialDays)
      .catch(() => {});
  }, []);

  function setField(
    field: Exclude<keyof typeof emptyForm, "personType">,
    value: string
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit() {
    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await companyOnboardingService.signup({
        legalName: form.legalName.trim(),
        tradeName: form.tradeName.trim() || undefined,
        document: onlyDigits(form.document),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        zipCode: onlyDigits(address.zipCode) || undefined,
        street: address.street.trim() || undefined,
        number: address.number.trim() || undefined,
        district: address.district.trim() || undefined,
        city: address.city.trim() || undefined,
        state: address.state.trim() || undefined,
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        planId,
        moduleIds: moduleIds.length > 0 ? moduleIds : undefined,
        payNow: payNow || undefined,
      });

      if (payNow) {
        // A resposta já veio com sessão ativa (ver CompanyController.
        // signup) — atualiza o AuthProvider pra ele saber disso
        // (também grava a empresa lembrada, igual um login normal).
        await refreshUser();
      }

      setDone(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível cadastrar a empresa.")
      );
    } finally {
      setLoading(false);
    }
  }

  if (!planId || planError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
            Escolha um plano pra começar
          </h1>

          <p className="mb-6 text-sm text-[var(--text-muted)]">
            {planError
              ? "Esse plano não foi encontrado. Escolha um na página de preços."
              : "O cadastro começa a partir da escolha do plano."}
          </p>

          <Link
            href="/planos"
            className="inline-block rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
          >
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
      <div className="w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-[var(--text-primary)]">
          Cadastrar empresa
        </h1>

        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Comece a usar o AlePejo ERP Cloud.
        </p>

        {plan && !done && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-[var(--primary)] p-4">
            <div>
              <p className="text-sm text-[var(--text-muted)]">
                Plano escolhido
              </p>
              <p className="font-semibold text-[var(--text-primary)]">
                {plan.name}
              </p>
            </div>

            <div className="text-right">
              {plan.code === "CUSTOM" ? (
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {moduleIds.length} módulo(s) selecionado(s)
                </p>
              ) : (
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {money(plan.monthlyPrice)}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    /mês
                  </span>
                </p>
              )}
              <Link
                href="/planos"
                className="text-xs text-[var(--text-secondary)] hover:underline"
              >
                Trocar plano
              </Link>
            </div>
          </div>
        )}

        {done ? (
          payNow ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--success)]">
                <CheckCircle2 size={20} />
                <p className="text-sm font-medium">
                  Empresa cadastrada — falta só pagar.
                </p>
              </div>

              <p className="text-sm text-[var(--text-secondary)]">
                Também enviamos um e-mail para{" "}
                <strong>{form.adminEmail}</strong> com o link pra
                definir sua senha (pra próxima vez que entrar) — por
                enquanto, já dá pra usar o sistema normalmente.
              </p>

              <PaymentCheckout
                finalLabel="Ir para o sistema"
                onFinal={() => {
                  window.location.href = "/";
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--success)]">
                <CheckCircle2 size={20} />
                <p className="text-sm font-medium">
                  Empresa cadastrada com sucesso.
                </p>
              </div>

              <p className="text-sm text-[var(--text-secondary)]">
                Enviamos um e-mail para <strong>{form.adminEmail}</strong>{" "}
                com o link para definir a senha e começar a usar o
                sistema. Seu teste grátis de {trialDays} dia
                {trialDays === 1 ? "" : "s"} já começou.
              </p>

              <Link
                href="/login"
                className="inline-block rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                Ir para o login
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className={labelClass} htmlFor="legalName">
                  Razão social{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>

                <input
                  id="legalName"
                  className={fieldClass}
                  value={form.legalName}
                  onChange={(e) =>
                    setField("legalName", e.target.value)
                  }
                />
              </div>

              <div className="sm:col-span-1">
                <label className={labelClass} htmlFor="personType">
                  Tipo de documento
                </label>

                <select
                  id="personType"
                  className={fieldClass}
                  value={form.personType}
                  onChange={(e) => {
                    const personType = e.target.value as
                      | "COMPANY"
                      | "INDIVIDUAL";

                    setForm((previous) => ({
                      ...previous,
                      personType,
                      // Reaplica a máscara certa ao trocar o tipo.
                      document: maskDocument(
                        previous.document,
                        personType
                      ),
                    }));
                  }}
                >
                  <option value="COMPANY">CNPJ</option>
                  <option value="INDIVIDUAL">CPF</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="document">
                  {isCompany ? "CNPJ" : "CPF"}{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>

                <input
                  id="document"
                  inputMode="numeric"
                  placeholder={
                    isCompany
                      ? "00.000.000/0000-00"
                      : "000.000.000-00"
                  }
                  className={fieldClass}
                  value={form.document}
                  onChange={(e) =>
                    setField(
                      "document",
                      maskDocument(e.target.value, form.personType)
                    )
                  }
                />
              </div>

              <div className="sm:col-span-3">
                <label className={labelClass} htmlFor="tradeName">
                  Nome fantasia
                </label>

                <input
                  id="tradeName"
                  className={fieldClass}
                  value={form.tradeName}
                  onChange={(e) =>
                    setField("tradeName", e.target.value)
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="email">
                  E-mail da empresa
                </label>

                <input
                  id="email"
                  type="email"
                  className={fieldClass}
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>

              <div className="sm:col-span-1">
                <label className={labelClass} htmlFor="phone">
                  Telefone
                </label>

                <input
                  id="phone"
                  className={fieldClass}
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>

              <AddressFields
                idPrefix="signup"
                value={address}
                onChange={setAddress}
              />
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="adminName">
                    Nome do administrador{" "}
                    <span className="text-[var(--danger)]">*</span>
                  </label>

                  <input
                    id="adminName"
                    className={fieldClass}
                    value={form.adminName}
                    onChange={(e) =>
                      setField("adminName", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="adminEmail">
                    E-mail do administrador{" "}
                    <span className="text-[var(--danger)]">*</span>
                  </label>

                  <input
                    id="adminEmail"
                    type="email"
                    className={fieldClass}
                    value={form.adminEmail}
                    onChange={(e) =>
                      setField("adminEmail", e.target.value)
                    }
                  />

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Será o e-mail de login do sistema.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

            <p className="text-xs text-[var(--text-muted)]">
              Ao cadastrar, você concorda com nossa{" "}
              <Link
                href="/privacidade"
                target="_blank"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                Política de Privacidade
              </Link>
              .
            </p>

            <div className="flex items-center justify-between">
              <Link
                href="/login"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Já tenho conta
              </Link>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSubmit()}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {loading ? "Cadastrando..." : "Cadastrar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CadastroEmpresaPage() {
  return (
    <Suspense fallback={null}>
      <CadastroEmpresaForm />
    </Suspense>
  );
}
