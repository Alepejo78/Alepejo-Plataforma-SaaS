"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { maskDocument, onlyDigits } from "@/lib/masks";
import {
  companyOnboardingService,
  type PublicPlan,
} from "@/services/company-onboarding.service";
import {
  billingService,
  type BillingCycle,
  type BillingType,
} from "@/services/billing.service";
import { PaymentCheckout } from "@/components/billing/PaymentCheckout";
import { PublicNav } from "@/components/marketing/PublicNav";
import "@/components/marketing/aurora.css";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function money(value: string | number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

const emptyForm = {
  personType: "COMPANY" as "COMPANY" | "INDIVIDUAL",
  document: "",
  name: "",
  email: "",
  phone: "",
};

/**
 * "Comprar agora" de /planos: cobra ANTES do cadastro. Pede só o
 * mínimo que o Asaas exige pra emitir a cobrança (documento, nome,
 * e-mail) — o cadastro completo da empresa vem depois, já com o
 * pagamento garantido, evitando cadastro à toa de quem desiste aqui.
 */
function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = searchParams.get("planId") ?? "";
  const billingCycle = (searchParams.get("cycle") === "YEARLY"
    ? "YEARLY"
    : "MONTHLY") as BillingCycle;
  const moduleIds = (searchParams.get("modules") ?? "")
    .split(",")
    .filter(Boolean);

  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [planError, setPlanError] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [checkoutId, setCheckoutId] = useState("");

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

  function setField(field: keyof typeof emptyForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function createCharge(billingType: BillingType) {
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.document.trim()) {
      const message = "Preencha documento, nome e e-mail antes de pagar.";
      setError(message);
      throw new Error(message);
    }

    const result = await billingService.createCheckout({
      planId,
      billingCycle,
      billingType,
      document: onlyDigits(form.document),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      moduleIds: moduleIds.length > 0 ? moduleIds : undefined,
    });

    setCheckoutId(result.checkoutId);

    return result;
  }

  if (!planId || planError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
            Escolha um plano pra começar
          </h1>

          <p className="mb-6 text-sm text-[var(--text-muted)]">
            A compra começa a partir da escolha do plano.
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

  const planPrice =
    billingCycle === "YEARLY" ? plan?.yearlyPrice : plan?.monthlyPrice;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div
        aria-hidden
        className="aurora-bg pointer-events-none absolute inset-x-0 top-0 h-[500px] opacity-[0.14]"
      />

      <PublicNav />

      <div className="relative mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/planos"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar para os planos
        </Link>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Finalizar compra
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Depois do pagamento você conclui o cadastro da sua empresa.
          </p>

          {plan && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--primary)] p-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">
                  Plano escolhido
                </p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {plan.name}
                  {plan.code === "CUSTOM" && moduleIds.length > 0 && (
                    <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">
                      · {moduleIds.length} módulo(s)
                    </span>
                  )}
                </p>
              </div>

              <div className="text-right">
                {plan.code !== "CUSTOM" && (
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {money(planPrice)}
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      {billingCycle === "YEARLY" ? "/ano" : "/mês"}
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

          <div className="mt-8 space-y-4">
            {checkoutId ? (
              <div className="flex items-start gap-2 rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                Cobrança gerada. Assim que o pagamento for confirmado sua
                assinatura fica ativa — você já pode concluir o cadastro.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="personType">
                    Tipo de documento
                  </label>

                  <select
                    id="personType"
                    className={fieldClass}
                    value={form.personType}
                    onChange={(e) =>
                      setForm((previous) => ({
                        ...previous,
                        personType: e.target.value as "COMPANY" | "INDIVIDUAL",
                        document: "",
                      }))
                    }
                  >
                    <option value="COMPANY">CNPJ</option>
                    <option value="INDIVIDUAL">CPF</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className={labelClass} htmlFor="document">
                    {isCompany ? "CNPJ" : "CPF"}{" "}
                    <span className="text-[var(--danger)]">*</span>
                  </label>

                  <input
                    id="document"
                    className={fieldClass}
                    placeholder={
                      isCompany ? "00.000.000/0000-00" : "000.000.000-00"
                    }
                    value={form.document}
                    onChange={(e) =>
                      setField("document", maskDocument(e.target.value))
                    }
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className={labelClass} htmlFor="name">
                    {isCompany ? "Razão social" : "Nome completo"}{" "}
                    <span className="text-[var(--danger)]">*</span>
                  </label>

                  <input
                    id="name"
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className={labelClass} htmlFor="email">
                    E-mail <span className="text-[var(--danger)]">*</span>
                  </label>

                  <input
                    id="email"
                    type="email"
                    className={fieldClass}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Onde a cobrança e o acesso serão enviados.
                  </p>
                </div>

                <div className="sm:col-span-2">
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
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

            {/* Montado uma vez só: se trocasse de lugar quando a cobrança
                é gerada, o React remontaria o componente e o PIX/boleto
                que ele acabou de mostrar sumiria da tela. */}
            <div className="border-t border-[var(--border)] pt-6">
              <PaymentCheckout
                charge={createCharge}
                submitLabel="Ir para o pagamento"
                finalLabel="Concluir cadastro da empresa"
                onFinal={() =>
                  router.push(`/cadastro-empresa?checkout=${checkoutId}`)
                }
              />
            </div>

            {!checkoutId && (
              <p className="text-center text-xs text-[var(--text-muted)]">
                Ao continuar, você concorda com nossa{" "}
                <Link href="/privacidade" className="hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}
