import { Injectable } from '@nestjs/common';
import { PayrollTaxBracket, PayrollTaxTable } from '@prisma/client';

/**
 * Motor de cálculo fiscal puro — não grava nada, só recebe números e
 * devolve números. Reaproveitado por Folha mensal, 13º e Férias (só
 * muda a base de cálculo que cada um monta antes de chamar).
 */
@Injectable()
export class PayrollCalculationService {
  /** imposto = base × alíquota_da_faixa − parcela_a_deduzir. */
  calculateProgressiveTax(
    base: number,
    brackets: PayrollTaxBracket[],
  ): number {
    if (base <= 0 || brackets.length === 0) {
      return 0;
    }

    const sorted = [...brackets].sort((a, b) => a.order - b.order);

    const bracket =
      sorted.find(
        (b) =>
          base >= Number(b.minBase) &&
          (b.maxBase === null || base <= Number(b.maxBase)),
      ) ?? sorted[sorted.length - 1];

    const tax = base * (Number(bracket.rate) / 100) - Number(bracket.deduction);

    return Math.max(0, round2(tax));
  }

  /**
   * Diferente do IRRF, a última faixa do INSS tem teto (maxBase
   * preenchido) — acima dele o desconto NÃO cresce mais (fica travado
   * no valor máximo da última faixa). Por isso a base é limitada ao
   * teto antes de aplicar a fórmula, senão uma base muito acima do
   * teto geraria um desconto maior que o máximo legal.
   */
  calculateInss(base: number, taxTable: PayrollTaxTable & { brackets: PayrollTaxBracket[] }): number {
    const brackets = taxTable.brackets.filter((b) => b.taxType === 'INSS');

    const ceiling = brackets.reduce(
      (max, b) => (b.maxBase !== null && Number(b.maxBase) > max ? Number(b.maxBase) : max),
      0,
    );

    const cappedBase = ceiling > 0 ? Math.min(base, ceiling) : base;

    return this.calculateProgressiveTax(cappedBase, brackets);
  }

  /**
   * Base de cálculo do IRRF = salário bruto − INSS − (dependentes
   * elegíveis × dedução/dependente). Redutor adicional 2026: pra base
   * tributável entre threshold e phaseOutEnd, desconta
   * `reliefBase − (reliefFactor × base)` do imposto já calculado.
   * Abaixo do threshold, isento total. Acima do phase-out, sem
   * redutor.
   */
  calculateIrrf(
    grossAmount: number,
    inssAmount: number,
    eligibleDependents: number,
    taxTable: PayrollTaxTable & { brackets: PayrollTaxBracket[] },
  ): { base: number; amount: number } {
    const dependentDeduction =
      eligibleDependents * Number(taxTable.dependentDeductionValue);

    const base = round2(
      Math.max(0, grossAmount - inssAmount - dependentDeduction),
    );

    const threshold = taxTable.irrfReliefThreshold
      ? Number(taxTable.irrfReliefThreshold)
      : null;

    if (threshold !== null && base <= threshold) {
      return { base, amount: 0 };
    }

    const brackets = taxTable.brackets.filter((b) => b.taxType === 'IRRF');
    let tax = this.calculateProgressiveTax(base, brackets);

    const phaseOutEnd = taxTable.irrfReliefPhaseOutEnd
      ? Number(taxTable.irrfReliefPhaseOutEnd)
      : null;
    const reliefBase = taxTable.irrfReliefBase
      ? Number(taxTable.irrfReliefBase)
      : null;
    const reliefFactor = taxTable.irrfReliefFactor
      ? Number(taxTable.irrfReliefFactor)
      : null;

    if (
      threshold !== null &&
      phaseOutEnd !== null &&
      reliefBase !== null &&
      reliefFactor !== null &&
      base > threshold &&
      base <= phaseOutEnd
    ) {
      const relief = reliefBase - reliefFactor * base;

      tax = Math.max(0, round2(tax - Math.max(0, relief)));
    }

    return { base, amount: tax };
  }

  calculateFgts(grossAmount: number, taxTable: PayrollTaxTable): number {
    return round2(grossAmount * (Number(taxTable.fgtsPercentage) / 100));
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
