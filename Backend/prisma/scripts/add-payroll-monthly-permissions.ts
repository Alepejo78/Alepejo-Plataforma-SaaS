import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill da Fase 3 (folha mensal) no banco já existente — mesmo
 * padrão de add-payroll-foundation.ts, só as permissões novas de
 * geração/aprovação da folha em si.
 */
const PAYROLL_PERMISSIONS: { code: string; name: string }[] = [
  { code: 'payroll.view', name: 'Consultar Folha de Pagamento' },
  { code: 'payroll.generate', name: 'Gerar Folha de Pagamento' },
  { code: 'payroll.update', name: 'Alterar Itens da Folha (recalcular/ajustar/excluir)' },
  { code: 'payroll.approve', name: 'Aprovar Folha de Pagamento' },
  { code: 'payroll.cancel', name: 'Cancelar Folha de Pagamento' },
  { code: 'payroll.report', name: 'Ver Relatórios/Holerites da Folha' },
];

async function main() {
  const group = await prisma.permissionGroup.upsert({
    where: { code: 'PAYROLL' },
    update: { name: 'Folha de Pagamento' },
    create: { code: 'PAYROLL', name: 'Folha de Pagamento' },
  });

  const permissionIds: string[] = [];

  for (const def of PAYROLL_PERMISSIONS) {
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
