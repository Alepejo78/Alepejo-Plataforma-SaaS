import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Backup de segurança em JSON (não temos pg_dump disponível neste
 * ambiente) — dump de toda tabela do schema public antes de uma
 * limpeza destrutiva. Não é um dump SQL real, mas dá pra reconstruir
 * os dados na mão/via script se precisar reverter.
 */
async function main() {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`,
  );

  const outDir = path.resolve(__dirname, '../../../backups');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `db-backup-${stamp}.json`);

  fs.mkdirSync(outDir, { recursive: true });

  const dump: Record<string, unknown[]> = {};

  for (const { tablename } of tables) {
    if (tablename.startsWith('_')) {
      continue;
    }

    const rows = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM "${tablename}";`,
    );

    dump[tablename] = rows;
    console.log(`${tablename}: ${rows.length} linha(s)`);
  }

  fs.writeFileSync(
    outFile,
    JSON.stringify(
      dump,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  );

  console.log(`\nBackup salvo em: ${outFile}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
