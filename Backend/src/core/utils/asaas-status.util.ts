/**
 * Vocabulário de status que o Asaas usa nos pagamentos — traduz pro
 * vocabulário fechado usado tanto por `BillingChargeStatus`
 * (assinatura da AlePejo) quanto por `EntryChargeStatus` (cobrança
 * de título de cliente) — os dois enums têm os mesmos valores.
 */
export function mapAsaasPaymentStatus(
  asaasStatus: string,
): 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED' {
  switch (asaasStatus) {
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
      return 'RECEIVED';
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'OVERDUE':
      return 'OVERDUE';
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
      return 'REFUNDED';
    case 'PENDING':
      return 'PENDING';
    default:
      return 'CANCELLED';
  }
}
