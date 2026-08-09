import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Gera o próximo número sequencial de um tipo de documento
 * (ex.: "QUOTE", "SALES_ORDER") para uma empresa. Usa upsert com
 * `increment` dentro da transação do chamador — a atualização do
 * contador trava a linha no banco, então duas requisições
 * simultâneas nunca recebem o mesmo número.
 */
@Injectable()
export class DocumentSequenceService {
  async next(
    tx: Prisma.TransactionClient,
    companyId: string,
    type: string,
  ): Promise<number> {
    const sequence = await tx.documentSequence.upsert({
      where: {
        companyId_type: { companyId, type },
      },
      create: {
        companyId,
        type,
        lastNumber: 1,
      },
      update: {
        lastNumber: { increment: 1 },
      },
    });

    return sequence.lastNumber;
  }
}
