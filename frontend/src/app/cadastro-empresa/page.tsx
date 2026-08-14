"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { maskDocument, onlyDigits } from "@/lib/masks";
import { companyOnboardingService } from "@/services/company-onboarding.service";

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
};

export default function CadastroEmpresaPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isCompany = form.personType === "COMPANY";

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
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        adminName: form.adminName.trim(),
      });

      setDone(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível cadastrar a empresa.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-[var(--text-primary)]">
          Cadastrar empresa
        </h1>

        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Comece a usar o AlePejo ERP Cloud.
        </p>

        {done ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--success)]">
              <CheckCircle2 size={20} />
              <p className="text-sm font-medium">
                Empresa cadastrada com sucesso.
              </p>
            </div>

            <p className="text-sm text-[var(--text-secondary)]">
              Enviamos um e-mail para <strong>{form.email}</strong>{" "}
              com o link para definir a senha e começar a usar o
              sistema.
            </p>

            <Link
              href="/login"
              className="inline-block rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
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

              <div>
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

              <div>
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

              <div>
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

              <div>
                <label className={labelClass} htmlFor="email">
                  E-mail{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>

                <input
                  id="email"
                  type="email"
                  className={fieldClass}
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Também será o e-mail de login do administrador.
                </p>
              </div>

              <div>
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

              <div className="sm:col-span-2">
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
            </div>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

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
