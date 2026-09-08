import { PaymentMethod, SurchargeType } from '@prisma/client';

export interface PaymentSurchargeSettings {
  boletoSurchargeType: SurchargeType | null;
  boletoSurchargeValue: unknown;
  transferSurchargeType: SurchargeType | null;
  transferSurchargeValue: unknown;
  pixSurchargeType: SurchargeType | null;
  pixSurchargeValue: unknown;
  cardSurchargeType: SurchargeType | null;
  cardSurchargeValue: unknown;
  cardInterestFreeInstallments: number;
  cardInterestRatePerInstallment: unknown;
}

export interface PaymentSurchargeResult {
  surchargeAmount: number;
  totalWithSurcharge: number;
}

/**
 * Acréscimo embutido no valor pago pelo cliente conforme a forma de
 * pagamento escolhida — mesmas configurações de `PaymentMethodSettings`
 * já usadas em `EntryChargeService` na hora de gerar a cobrança real,
 * só que aqui aplicado ANTES, no próprio documento (OS/Pedido de
 * Venda/Venda/aprovação pública do orçamento), pra o valor que o
 * cliente vê e assina já sair certo.
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
  settings: PaymentSurchargeSettings;
}): PaymentSurchargeResult {
  const round = (value: number) => Math.round(value * 100) / 100;

  if (!paymentMethod || baseAmount <= 0) {
    return { surchargeAmount: 0, totalWithSurcharge: round(baseAmount) };
  }

  let surchargeAmount = 0;

  switch (paymentMethod) {
    case PaymentMethod.BOLETO: {
      const { boletoSurchargeType: type, boletoSurchargeValue: value } =
        settings;
      const numericValue = Number(value);

      if (type === SurchargeType.FIXED && numericValue) {
        // Cada parcela é um boleto emitido — o acréscimo fixo é
        // cobrado por parcela, não uma vez só sobre o total.
        surchargeAmount = numericValue * installmentsCount;
      } else if (type === SurchargeType.PERCENT && numericValue) {
        surchargeAmount = baseAmount * (numericValue / 100);
      }

      break;
    }

    case PaymentMethod.PIX: {
      const { pixSurchargeType: type, pixSurchargeValue: value } = settings;
      const numericValue = Number(value);

      if (type === SurchargeType.FIXED && numericValue) {
        surchargeAmount = numericValue;
      } else if (type === SurchargeType.PERCENT && numericValue) {
        surchargeAmount = baseAmount * (numericValue / 100);
      }

      break;
    }

    case PaymentMethod.TRANSFERENCIA:
    case PaymentMethod.DEPOSITO: {
      const { transferSurchargeType: type, transferSurchargeValue: value } =
        settings;
      const numericValue = Number(value);

      if (type === SurchargeType.FIXED && numericValue) {
        surchargeAmount = numericValue;
      } else if (type === SurchargeType.PERCENT && numericValue) {
        surchargeAmount = baseAmount * (numericValue / 100);
      }

      break;
    }

    case PaymentMethod.CREDITO:
    case PaymentMethod.DEBITO: {
      const { cardSurchargeType: type, cardSurchargeValue: value } =
        settings;
      const numericValue = Number(value);

      if (type === SurchargeType.FIXED && numericValue) {
        surchargeAmount += numericValue;
      } else if (type === SurchargeType.PERCENT && numericValue) {
        surchargeAmount += baseAmount * (numericValue / 100);
      }

      const chargeableInstallments = Math.max(
        0,
        installmentsCount - settings.cardInterestFreeInstallments,
      );
      const interestRate = Number(settings.cardInterestRatePerInstallment);

      if (chargeableInstallments > 0 && interestRate > 0) {
        surchargeAmount += baseAmount * (interestRate / 100) * chargeableInstallments;
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
