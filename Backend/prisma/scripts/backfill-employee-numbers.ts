import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Atribui a matrícula (`employeeNumber`) aos colaboradores que já
 * existiam antes desse campo ser criado — sem isso, ficariam pra
 * sempre com "—" na tela em vez de um número. Numera por empresa, na
 * ordem de cadastro (mais antigo primeiro = matrícula menor), e ajusta
 * o `DocumentSequence` (type "EMPLOYEE") de cada empresa pro próximo
 * colaborador criado continuar dali, sem colidir.
 */
async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, tradeName: true, legalName: true },
  });

  let totalAssigned = 0;

  for (const company of companies) {
    const pending = await prisma.employee.findMany({
      where: { companyId: company.id, employeeNumber: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (pending.length === 0) {
      continue;
    }

    const highest = await prisma.employee.findFirst({
      where: { companyId: company.id, employeeNumber: { not: null } },
      orderBy: { employeeNumber: 'desc' },
      select: { employeeNumber: true },
    });

    let next = (highest?.employeeNumber ?? 0) + 1;

    for (const employee of pending) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { employeeNumber: next },
      });

      next += 1;
    }

    await prisma.documentSequence.upsert({
      where: { companyId_type: { companyId: company.id, type: 'EMPLOYEE' } },
      update: { lastNumber: next - 1 },
      create: { companyId: company.id, type: 'EMPLOYEE', lastNumber: next - 1 },
    });

    console.log(
      `${company.tradeName ?? company.legalName}: ${pending.length} colaborador(es) numerado(s), próxima matrícula será ${next}.`,
    );

    totalAssigned += pending.length;
  }

  console.log(`\nTotal: ${totalAssigned} colaborador(es) atualizado(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
