import type { PaymentMethod } from "@/services/financial-entry.service";
import type { PaymentMethodSettings } from "@/services/payment-method-settings.service";

export interface PaymentSurchargeResult {
  surchargeAmount: number;
  totalWithSurcharge: number;
}

/**
 * Espelha `Backend/src/core/utils/payment-surcharge.util.ts` — usado só
 * pra prévia em tela (OS, Pedido de Venda, Venda), antes de salvar. O
 * valor que vale de verdade é sempre recalculado no backend.
 */
export function calculatePaymentSurcharge({
  paymentMethod,
  baseAmount,
  installmentsCount,
  settings,
}: {
  paymentMethod: PaymentMethod | null | undefined;
  baseAmount: number;
  installmentsCount: number;
  settings: PaymentMethodSettings;
}): PaymentSurchargeResult {
  const round = (value: number) => Math.round(value * 100) / 100;

  if (!paymentMethod || baseAmount <= 0) {
    return { surchargeAmount: 0, totalWithSurcharge: round(baseAmount) };
  }

  let surchargeAmount = 0;

  switch (paymentMethod) {
    case "BOLETO": {
      const type = settings.boletoSurchargeType;
      const value = Number(settings.boletoSurchargeValue);

      if (type === "FIXED" && value) {
        surchargeAmount = value * installmentsCount;
      } else if (type === "PERCENT" && value) {
        surchargeAmount = baseAmount * (value / 100);
      }

      break;
    }

    case "PIX": {
      const type = settings.pixSurchargeType;
      const value = Number(settings.pixSurchargeValue);

      if (type === "FIXED" && value) {
        surchargeAmount = value;
      } else if (type === "PERCENT" && value) {
        surchargeAmount = baseAmount * (value / 100);
      }

      break;
    }

    case "TRANSFERENCIA":
    case "DEPOSITO": {
      const type = settings.transferSurchargeType;
      const value = Number(settings.transferSurchargeValue);

      if (type === "FIXED" && value) {
        surchargeAmount = value;
      } else if (type === "PERCENT" && value) {
        surchargeAmount = baseAmount * (value / 100);
      }

      break;
    }

    case "CREDITO":
    case "DEBITO": {
      const type = settings.cardSurchargeType;
      const value = Number(settings.cardSurchargeValue);

      if (type === "FIXED" && value) {
        surchargeAmount += value;
      } else if (type === "PERCENT" && value) {
        surchargeAmount += baseAmount * (value / 100);
      }

      const chargeableInstallments = Math.max(
        0,
        installmentsCount - settings.cardInterestFreeInstallments
      );
      const interestRate = Number(settings.cardInterestRatePerInstallment);

      if (chargeableInstallments > 0 && interestRate > 0) {
        surchargeAmount +=
          baseAmount * (interestRate / 100) * chargeableInstallments;
      }

      break;
    }

    default:
      break;
  }

  surchargeAmount = round(surchargeAmount);

  return {
    surchargeAmount,
    totalWithSurcharge: round(baseAmount + surchargeAmount),
  };
}
