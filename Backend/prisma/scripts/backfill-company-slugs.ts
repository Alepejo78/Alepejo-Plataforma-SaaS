import { PrismaClient } from '@prisma/client';

import { generateUniqueSlug } from '../../src/modules/identity/company/utils/slug.util';

const prisma = new PrismaClient();

/**
 * Consulta/grava via SQL cru: no momento em que este script roda, a
 * coluna `slug` ainda é nullable no banco (migration em duas etapas —
 * ver 20260818090000_company_slug), mas o schema.prisma já a declara
 * NOT NULL (estado final). O client gerado não aceita mais `null`
 * pra esse campo, então o filtro/update passam por cima do tipo.
 */
async function main() {
  const companies = await prisma.$queryRaw<
    { id: string; legalName: string; tradeName: string | null }[]
  >`SELECT id, "legalName", "tradeName" FROM companies WHERE slug IS NULL`;

  for (const company of companies) {
    const slug = await generateUniqueSlug(
      company.tradeName || company.legalName,
      async (candidate) => {
        const rows = await prisma.$queryRaw<
          { id: string }[]
        >`SELECT id FROM companies WHERE slug = ${candidate}`;

        return rows.length > 0;
      },
    );

    await prisma.$executeRaw`UPDATE companies SET slug = ${slug} WHERE id = ${company.id}`;

    console.log(`${company.legalName} -> ${slug}`);
  }

  console.log(`${companies.length} empresa(s) atualizada(s).`);
}

main().finally(() => prisma.$disconnect());
