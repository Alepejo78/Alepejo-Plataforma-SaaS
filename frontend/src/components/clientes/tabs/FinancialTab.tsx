"use client";

import { FormField } from "@/components/ui/FormField";

interface FinancialTabProps {
  form: {
    creditLimit: string;
    paymentTerm: string;
    priceTable: string;
    carrier: string;
    seller: string;
    bank: string;
    agency: string;
    account: string;
    pixKey: string;
  };
  onChange: (field: string, value: string) => void;
}

export function FinancialTab({
  form,
  onChange,
}: FinancialTabProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">

      <FormField
        label="Limite de Crédito"
        value={form.creditLimit}
        placeholder="0,00"
        onChange={(e) =>
          onChange("creditLimit", e.target.value)
        }
      />

      <FormField
        label="Prazo de Pagamento"
        value={form.paymentTerm}
        onChange={(e) =>
          onChange("paymentTerm", e.target.value)
        }
      />

      <FormField
        label="Tabela de Preço"
        value={form.priceTable}
        onChange={(e) =>
          onChange("priceTable", e.target.value)
        }
      />

      <FormField
        label="Transportadora"
        value={form.carrier}
        onChange={(e) =>
          onChange("carrier", e.target.value)
        }
      />

      <FormField
        label="Vendedor"
        value={form.seller}
        onChange={(e) =>
          onChange("seller", e.target.value)
        }
      />

      <FormField
        label="Banco"
        value={form.bank}
        onChange={(e) =>
          onChange("bank", e.target.value)
        }
      />

      <FormField
        label="Agência"
        value={form.agency}
        onChange={(e) =>
          onChange("agency", e.target.value)
        }
      />

      <FormField
        label="Conta"
        value={form.account}
        onChange={(e) =>
          onChange("account", e.target.value)
        }
      />

      <FormField
        label="Chave PIX"
        value={form.pixKey}
        onChange={(e) =>
          onChange("pixKey", e.target.value)
        }
      />

    </div>
  );
}