"use client";

import { FinancialEntriesScreen } from "@/components/financial/FinancialEntriesScreen";

export default function ContasReceberPage() {
  return (
    <FinancialEntriesScreen
      type="RECEIVABLE"
      title="Contas a receber"
      partnerRole="CUSTOMER"
      partnerLabel="Cliente"
    />
  );
}
