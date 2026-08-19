import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Corrige o vazamento: `provisionAdminRole()` concedia TODAS as
 * permissions (inclusive `platform.*`) pro admin de qualquer empresa
 * nova. Remove os vínculos `platform.*` de roles de empresas que não
 * sejam a ALEPEJO (a dona da plataforma, código "ALEPEJO" no seed).
 * Rodar em qualquer ambiente que já tenha empresas cadastradas antes
 * dessa correção.
 */
async function main() {
  const platformPermissions = await prisma.permission.findMany({
    where: { code: { startsWith: 'platform.' } },
    select: { id: true, code: true },
  });

  if (platformPermissions.length === 0) {
    console.log('Nenhuma permission platform.* encontrada.');
    return;
  }

  const roles = await prisma.role.findMany({
    where: { company: { code: { not: 'ALEPEJO' } } },
    select: { id: true, name: true, companyId: true },
  });

  const result = await prisma.rolePermission.deleteMany({
    where: {
      roleId: { in: roles.map((role) => role.id) },
      permissionId: { in: platformPermissions.map((p) => p.id) },
    },
  });

  console.log(
    `${result.count} vínculo(s) platform.* removido(s) de roles de empresas-cliente.`,
  );
}

main().finally(() => prisma.$disconnect());
