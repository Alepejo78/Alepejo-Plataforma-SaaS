import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill da Fase 5 (Férias) no banco já existente — mesmo padrão de
 * add-thirteenth-salary-permissions.ts.
 */
const PERMISSIONS: { code: string; name: string }[] = [
  { code: 'vacation.view', name: 'Consultar Férias' },
  { code: 'vacation.create', name: 'Conceder Férias' },
  { code: 'vacation.update', name: 'Ajustar Gozo de Férias' },
  { code: 'vacation.approve', name: 'Aprovar Gozo de Férias' },
  { code: 'vacation.cancel', name: 'Cancelar Gozo de Férias' },
  { code: 'vacation.report', name: 'Ver Recibos de Férias' },
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
