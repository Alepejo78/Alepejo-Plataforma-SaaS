"use client";

import { PageAccessGuard } from "@/components/auth/PageAccessGuard";
import { FinancialEntriesScreen } from "@/components/financial/FinancialEntriesScreen";

export default function ContasReceberPage() {
  return (
    <PageAccessGuard permission="financial-entry.view">
      <FinancialEntriesScreen
        type="RECEIVABLE"
        title="Contas a receber"
        partnerRole="CUSTOMER"
        partnerLabel="Cliente"
      />
    </PageAccessGuard>
  );
}
