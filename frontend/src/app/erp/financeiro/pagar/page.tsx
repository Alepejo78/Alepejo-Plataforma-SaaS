"use client";

import { PageAccessGuard } from "@/components/auth/PageAccessGuard";
import { FinancialEntriesScreen } from "@/components/financial/FinancialEntriesScreen";

export default function ContasPagarPage() {
  return (
    <PageAccessGuard permission="financial-entry.view">
      <FinancialEntriesScreen
        type="PAYABLE"
        title="Contas a pagar"
        partnerRole="SUPPLIER"
        partnerLabel="Fornecedor"
      />
    </PageAccessGuard>
  );
}
