"use client";

import { FormField } from "@/components/ui/FormField";

interface GeneralTabProps {
  form: {
    personType: string;
    status: string;
    corporateName: string;
    tradeName: string;
    document: string;
    stateRegistration: string;
    municipalRegistration: string;
    email: string;
    phone: string;
    mobilePhone: string;
    website: string;
  };
  onChange: (field: string, value: string) => void;
}

export function GeneralTab({
  form,
  onChange,
}: GeneralTabProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div>
        <label className="mb-2 block text-sm font-medium">
          Tipo Pessoa
        </label>

        <select
          value={form.personType}
          onChange={(e) =>
            onChange("personType", e.target.value)
          }
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4"
        >
          <option value="LEGAL_PERSON">
            Pessoa Jurídica
          </option>

          <option value="NATURAL_PERSON">
            Pessoa Física
          </option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Situação
        </label>

        <select
          value={form.status}
          onChange={(e) =>
            onChange("status", e.target.value)
          }
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4"
        >
          <option value="ACTIVE">
            Ativo
          </option>

          <option value="INACTIVE">
            Inativo
          </option>
        </select>
      </div>

      <FormField
        label="Código"
        value="Automático"
        disabled
      />

      <div className="xl:col-span-3">
        <FormField
          label="Razão Social"
          value={form.corporateName}
          placeholder="Informe a razão social"
          required
          onChange={(e) =>
            onChange(
              "corporateName",
              e.target.value,
            )
          }
        />
      </div>

      <FormField
        label="Nome Fantasia"
        value={form.tradeName}
        placeholder="Nome Fantasia"
        onChange={(e) =>
          onChange(
            "tradeName",
            e.target.value,
          )
        }
      />

      <FormField
        label="CPF / CNPJ"
        value={form.document}
        placeholder="00.000.000/0000-00"
        required
        onChange={(e) =>
          onChange(
            "document",
            e.target.value,
          )
        }
      />

      <FormField
        label="Inscrição Estadual"
        value={form.stateRegistration}
        onChange={(e) =>
          onChange(
            "stateRegistration",
            e.target.value,
          )
        }
      />

      <FormField
        label="Inscrição Municipal"
        value={form.municipalRegistration}
        onChange={(e) =>
          onChange(
            "municipalRegistration",
            e.target.value,
          )
        }
      />

      <FormField
        label="E-mail"
        type="email"
        value={form.email}
        onChange={(e) =>
          onChange(
            "email",
            e.target.value,
          )
        }
      />

      <FormField
        label="Telefone"
        value={form.phone}
        onChange={(e) =>
          onChange(
            "phone",
            e.target.value,
          )
        }
      />

      <FormField
        label="Celular"
        value={form.mobilePhone}
        onChange={(e) =>
          onChange(
            "mobilePhone",
            e.target.value,
          )
        }
      />

      <FormField
        label="Site"
        value={form.website}
        onChange={(e) =>
          onChange(
            "website",
            e.target.value,
          )
        }
      />
    </div>
  );
}