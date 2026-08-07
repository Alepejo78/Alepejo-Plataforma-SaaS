"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import {
  isValidCEPLength,
  isValidCNPJLength,
  maskCEP,
  maskDocument,
  maskPhone,
  onlyDigits,
} from "@/lib/masks";

import { lookupService } from "@/services/lookup.service";

import {
  ROLE_LABELS,
  type BusinessPartner,
  type PartnerPayload,
  type PartnerRole,
  type PersonType,
} from "@/services/partner.service";

const ROLES: PartnerRole[] = [
  "CUSTOMER",
  "SUPPLIER",
  "CARRIER",
  "SALES_REP",
];

const emptyForm: Partial<PartnerPayload> = {
  roles: [],
  personType: "COMPANY",
  legalName: "",
  tradeName: "",
  document: "",
  stateRegistration: "",
  email: "",
  phone: "",
  mobile: "",
  contactName: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  notes: "",
  status: "ACTIVE",
};

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors
  focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

interface Props {
  partner?: BusinessPartner | null;
  saving: boolean;
  error?: string;
  onSubmit: (payload: Partial<PartnerPayload>) => void;
  onCancel: () => void;
}

export function PartnerForm({
  partner,
  saving,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] =
    useState<Partial<PartnerPayload>>(emptyForm);

  const [lookupError, setLookupError] = useState("");
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  // Após buscar o CEP, o cursor vai para o número: é o único
  // dado do endereço que a consulta não traz.
  const numberRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (partner) {
      setForm({
        ...partner,
        document: maskDocument(
          partner.document,
          partner.personType
        ),
        zipCode: maskCEP(partner.zipCode ?? ""),
        phone: maskPhone(partner.phone ?? ""),
        mobile: maskPhone(partner.mobile ?? ""),
      });
    } else {
      setForm(emptyForm);
    }

    setLookupError("");
  }, [partner]);

  const isCompany = form.personType === "COMPANY";

  function setField(
    field: keyof PartnerPayload,
    value: unknown
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleCnpjLookup() {
    if (!isCompany || !isValidCNPJLength(form.document ?? "")) {
      return;
    }

    setLoadingCnpj(true);
    setLookupError("");

    try {
      const data = await lookupService.cnpj(
        form.document ?? ""
      );

      setForm((previous) => ({
        ...previous,
        legalName: data.legalName || previous.legalName,
        tradeName: data.tradeName ?? previous.tradeName,
        email: data.email ?? previous.email,
        phone: data.phone
          ? maskPhone(data.phone)
          : previous.phone,
        zipCode: data.zipCode
          ? maskCEP(data.zipCode)
          : previous.zipCode,
        street: data.street ?? previous.street,
        number: data.number ?? previous.number,
        complement: data.complement ?? previous.complement,
        district: data.district ?? previous.district,
        city: data.city ?? previous.city,
        state: data.state ?? previous.state,
      }));
    } catch (err) {
      setLookupError(
        err instanceof Error
          ? err.message
          : "Não foi possível consultar o CNPJ."
      );
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function handleCepLookup(value: string) {
    if (!isValidCEPLength(value)) {
      return;
    }

    setLoadingCep(true);
    setLookupError("");

    try {
      const data = await lookupService.cep(value);

      setForm((previous) => ({
        ...previous,
        street: data.street ?? previous.street,
        district: data.district ?? previous.district,
        city: data.city ?? previous.city,
        state: data.state ?? previous.state,
      }));

      numberRef.current?.focus();
    } catch (err) {
      setLookupError(
        err instanceof Error
          ? err.message
          : "Não foi possível consultar o CEP."
      );
    } finally {
      setLoadingCep(false);
    }
  }

  function handleSubmit() {
    // Envia SOMENTE os campos editáveis. Campos gerenciados pelo
    // servidor (id, companyId, createdAt, updatedAt, deletedAt) não
    // podem ir no payload: a API os rejeita por segurança.
    //
    // Strings vazias viram undefined para não gravar "" no lugar de
    // nulo, e os campos com máscara são enviados só com dígitos.
    const text = (value?: string | null) => {
      const trimmed = (value ?? "").trim();

      return trimmed.length > 0 ? trimmed : undefined;
    };

    const digits = (value?: string | null) => {
      const clean = onlyDigits(value ?? "");

      return clean.length > 0 ? clean : undefined;
    };

    onSubmit({
      roles: form.roles ?? [],
      personType: form.personType,
      legalName: (form.legalName ?? "").trim(),
      tradeName: text(form.tradeName),
      document: onlyDigits(form.document ?? ""),
      stateRegistration: text(form.stateRegistration),
      email: text(form.email),
      phone: digits(form.phone),
      mobile: digits(form.mobile),
      contactName: text(form.contactName),
      zipCode: digits(form.zipCode),
      street: text(form.street),
      number: text(form.number),
      complement: text(form.complement),
      district: text(form.district),
      city: text(form.city),
      state: text(form.state),
      notes: text(form.notes),
      status: form.status,
    });
  }

  function toggleRole(role: PartnerRole) {
    const current = form.roles ?? [];

    setField(
      "roles",
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  }

  return (
    <div className="space-y-6">
      {/* Papéis: o que define onde o parceiro pode ser usado */}
      <section>
        <span className={labelClass}>
          Papéis <span className="text-[var(--danger)]">*</span>
        </span>

        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => {
            const checked = (form.roles ?? []).includes(role);

            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                aria-pressed={checked}
                className={`
                  rounded-lg border px-3 py-1.5 text-xs font-medium
                  transition-colors
                  ${
                    checked
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-contrast)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  }
                `}
              >
                {ROLE_LABELS[role]}
              </button>
            );
          })}
        </div>

      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="personType">
            Tipo de pessoa
          </label>

          <select
            id="personType"
            className={fieldClass}
            value={form.personType ?? "COMPANY"}
            onChange={(e) => {
              const personType = e.target
                .value as PersonType;

              setForm((previous) => ({
                ...previous,
                personType,
                // Reaplica a máscara correta ao trocar o tipo.
                document: maskDocument(
                  previous.document ?? "",
                  personType
                ),
              }));
            }}
          >
            <option value="COMPANY">Jurídica</option>
            <option value="INDIVIDUAL">Física</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="document">
            {isCompany ? "CNPJ" : "CPF"}{" "}
            <span className="text-[var(--danger)]">*</span>
          </label>

          <div className="flex gap-2">
            <input
              id="document"
              inputMode="numeric"
              placeholder={
                isCompany
                  ? "00.000.000/0000-00"
                  : "000.000.000-00"
              }
              className={fieldClass}
              value={form.document ?? ""}
              onChange={(e) =>
                setField(
                  "document",
                  maskDocument(
                    e.target.value,
                    form.personType
                  )
                )
              }
              onBlur={() => {
                if (isCompany) {
                  void handleCnpjLookup();
                }
              }}
            />

            {isCompany && (
              <button
                type="button"
                onClick={() => void handleCnpjLookup()}
                disabled={
                  loadingCnpj ||
                  !isValidCNPJLength(form.document ?? "")
                }
                title="Buscar dados na Receita Federal"
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
              >
                {loadingCnpj ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Search size={16} />
                )}
                Buscar
              </button>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="legalName">
            {isCompany ? "Razão social" : "Nome completo"}{" "}
            <span className="text-[var(--danger)]">*</span>
          </label>

          <input
            id="legalName"
            className={fieldClass}
            value={form.legalName ?? ""}
            onChange={(e) =>
              setField("legalName", e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="tradeName">
            {isCompany ? "Nome fantasia" : "Apelido"}
          </label>

          <input
            id="tradeName"
            className={fieldClass}
            value={form.tradeName ?? ""}
            onChange={(e) =>
              setField("tradeName", e.target.value)
            }
          />
        </div>

        <div>
          <label
            className={labelClass}
            htmlFor="stateRegistration"
          >
            {isCompany ? "Inscrição estadual" : "RG"}
          </label>

          <input
            id="stateRegistration"
            className={fieldClass}
            value={form.stateRegistration ?? ""}
            onChange={(e) =>
              setField("stateRegistration", e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="status">
            Situação
          </label>

          <select
            id="status"
            className={fieldClass}
            value={form.status ?? "ACTIVE"}
            onChange={(e) =>
              setField("status", e.target.value)
            }
          >
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="BLOCKED">Bloqueado</option>
          </select>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="email">
            E-mail
          </label>

          <input
            id="email"
            type="email"
            className={fieldClass}
            value={form.email ?? ""}
            onChange={(e) =>
              setField("email", e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="contactName">
            Contato
          </label>

          <input
            id="contactName"
            className={fieldClass}
            value={form.contactName ?? ""}
            onChange={(e) =>
              setField("contactName", e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="phone">
            Telefone
          </label>

          <input
            id="phone"
            inputMode="numeric"
            placeholder="(00) 0000-0000"
            className={fieldClass}
            value={form.phone ?? ""}
            onChange={(e) =>
              setField("phone", maskPhone(e.target.value))
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="mobile">
            Celular
          </label>

          <input
            id="mobile"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            className={fieldClass}
            value={form.mobile ?? ""}
            onChange={(e) =>
              setField("mobile", maskPhone(e.target.value))
            }
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="zipCode">
            CEP
          </label>

          <div className="relative">
            <input
              id="zipCode"
              inputMode="numeric"
              placeholder="00000-000"
              className={fieldClass}
              value={form.zipCode ?? ""}
              onChange={(e) => {
                const masked = maskCEP(e.target.value);

                setField("zipCode", masked);

                // Busca assim que o CEP fica completo.
                if (isValidCEPLength(masked)) {
                  void handleCepLookup(masked);
                }
              }}
            />

            {loadingCep && (
              <Loader2
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--text-muted)]"
              />
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          <label className={labelClass} htmlFor="street">
            Logradouro
          </label>

          <input
            id="street"
            className={fieldClass}
            value={form.street ?? ""}
            onChange={(e) =>
              setField("street", e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="number">
            Número
          </label>

          <input
            id="number"
            ref={numberRef}
            className={fieldClass}
            value={form.number ?? ""}
            onChange={(e) =>
              setField("number", e.target.value)
            }
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="complement">
            Complemento
          </label>

          <input
            id="complement"
            className={fieldClass}
            value={form.complement ?? ""}
            onChange={(e) =>
              setField("complement", e.target.value)
            }
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="district">
            Bairro
          </label>

          <input
            id="district"
            className={fieldClass}
            value={form.district ?? ""}
            onChange={(e) =>
              setField("district", e.target.value)
            }
          />
        </div>

        <div className="md:col-span-3">
          <label className={labelClass} htmlFor="city">
            Cidade
          </label>

          <input
            id="city"
            className={fieldClass}
            value={form.city ?? ""}
            onChange={(e) =>
              setField("city", e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="state">
            UF
          </label>

          <input
            id="state"
            maxLength={2}
            className={fieldClass}
            value={form.state ?? ""}
            onChange={(e) =>
              setField(
                "state",
                e.target.value.toUpperCase()
              )
            }
          />
        </div>
      </section>

      <div>
        <label className={labelClass} htmlFor="notes">
          Observações
        </label>

        <textarea
          id="notes"
          rows={3}
          className={`${fieldClass} h-auto py-2`}
          value={form.notes ?? ""}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>

      {lookupError && (
        <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]">
          {lookupError}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          Cancelar
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
