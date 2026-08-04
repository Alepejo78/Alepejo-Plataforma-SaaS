"use client";

import { FormField } from "@/components/ui/FormField";

interface AddressTabProps {
  form: {
    zipCode: string;
    address: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
    country: string;
  };
  onChange: (field: string, value: string) => void;
}

export function AddressTab({
  form,
  onChange,
}: AddressTabProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">

      <FormField
        label="CEP"
        value={form.zipCode}
        placeholder="00000-000"
        onChange={(e) =>
          onChange("zipCode", e.target.value)
        }
      />

      <div className="xl:col-span-2">
        <FormField
          label="Endereço"
          value={form.address}
          placeholder="Rua / Avenida"
          onChange={(e) =>
            onChange("address", e.target.value)
          }
        />
      </div>

      <FormField
        label="Número"
        value={form.number}
        onChange={(e) =>
          onChange("number", e.target.value)
        }
      />

      <div className="xl:col-span-2">
        <FormField
          label="Complemento"
          value={form.complement}
          onChange={(e) =>
            onChange("complement", e.target.value)
          }
        />
      </div>

      <FormField
        label="Bairro"
        value={form.district}
        onChange={(e) =>
          onChange("district", e.target.value)
        }
      />

      <FormField
        label="Cidade"
        value={form.city}
        onChange={(e) =>
          onChange("city", e.target.value)
        }
      />

      <FormField
        label="UF"
        value={form.state}
        onChange={(e) =>
          onChange("state", e.target.value)
        }
      />

      <FormField
        label="País"
        value={form.country}
        onChange={(e) =>
          onChange("country", e.target.value)
        }
      />

    </div>
  );
}