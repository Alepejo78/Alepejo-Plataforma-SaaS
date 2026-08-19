import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill da Fase 4 (13º salário) no banco já existente — mesmo
 * padrão de add-payroll-monthly-permissions.ts.
 */
const PERMISSIONS: { code: string; name: string }[] = [
  { code: 'thirteenth-salary.view', name: 'Consultar 13º Salário' },
  { code: 'thirteenth-salary.generate', name: 'Gerar Parcela de 13º Salário' },
  { code: 'thirteenth-salary.update', name: 'Alterar Itens do 13º (ajustar/excluir)' },
  { code: 'thirteenth-salary.approve', name: 'Aprovar 13º Salário' },
  { code: 'thirteenth-salary.cancel', name: 'Cancelar 13º Salário' },
  { code: 'thirteenth-salary.report', name: 'Ver Recibos do 13º Salário' },
];

async function main() {
  const group = await prisma.permissionGroup.upsert({
    where: { code: 'PAYROLL' },
    update: { name: 'Folha de Pagamento' },
    create: { code: 'PAYROLL', name: 'Folha de Pagamento' },
  });

  const permissionIds: string[] = [];

  for (const def of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: def.code },
      update: { name: def.name, groupId: group.id },
      create: { code: def.code, name: def.name, groupId: group.id },
    });

    permissionIds.push(permission.id);
    console.log(`Permissão OK: ${def.code}`);
  }

  const adminRoles = await prisma.role.findMany({
    where: { code: 'ADMIN' },
    select: { id: true },
  });

  let grants = 0;

  for (const role of adminRoles) {
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });

      grants += 1;
    }
  }

  console.log(
    `${adminRoles.length} perfil(is) Administrador — ${grants} vínculo(s) garantido(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
