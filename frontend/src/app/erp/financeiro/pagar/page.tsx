"use client";

import { FinancialEntriesScreen } from "@/components/financial/FinancialEntriesScreen";

export default function ContasPagarPage() {
  return (
    <FinancialEntriesScreen
      type="PAYABLE"
      title="Contas a pagar"
      partnerRole="SUPPLIER"
      partnerLabel="Fornecedor"
    />
  );
}
