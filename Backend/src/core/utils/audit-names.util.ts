import { PrismaService } from '../prisma/prisma.service';

export interface AuditableRecord {
  createdById?: string | null;
  updatedById?: string | null;
}

export interface AuditNames {
  createdByName: string | null;
  updatedByName: string | null;
}

/**
 * `createdById`/`updatedById` são campos soltos (sem relation do
 * Prisma — mesmo padrão de `approvedByUserId` em Payroll/férias/13º),
 * então não dá pra pedir `include`. Resolve o nome de todos os
 * usuários referenciados num lote só (nunca N+1).
 */
export async function attachAuditNames<T extends AuditableRecord>(
  prisma: PrismaService,
  records: T[],
): Promise<(T & AuditNames)[]> {
  const ids = [
    ...new Set(
      records
        .flatMap((r) => [r.createdById, r.updatedById])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (ids.length === 0) {
    return records.map((r) => ({
      ...r,
      createdByName: null,
      updatedByName: null,
    }));
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });

  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return records.map((r) => ({
    ...r,
    createdByName: r.createdById
      ? (nameById.get(r.createdById) ?? null)
      : null,
    updatedByName: r.updatedById
      ? (nameById.get(r.updatedById) ?? null)
      : null,
  }));
}

/** Mesma resolução, pra um único registro (findOne). */
export async function attachAuditName<T extends AuditableRecord>(
  prisma: PrismaService,
  record: T,
): Promise<T & AuditNames> {
  const [result] = await attachAuditNames(prisma, [record]);

  return result;
}
