import { PrismaService } from '../prisma/prisma.service';

/**
 * Todos os usuários ativos da empresa com uma permissão liberada
 * (ALLOW em algum perfil ativo, sem DENY em nenhum) — mesma regra de
 * precedência de `hasPermission` (ver `core/utils/permission.util`),
 * só que consultada direto no banco. Usado nos fluxos de confirmação
 * digital (Orçamento, Ordem de Serviço), onde não há usuário logado/
 * JWT pra reaproveitar a lista já resolvida — precisa achar "todo
 * mundo que pode aprovar isso" pra notificar por e-mail.
 */
export async function findUsersWithPermission(
  prisma: PrismaService,
  companyId: string,
  permissionCode: string,
) {
  return prisma.user.findMany({
    where: {
      companyId,
      active: true,
      roles: {
        some: {
          role: {
            active: true,
            permissions: {
              some: {
                permission: { code: permissionCode },
                effect: 'ALLOW',
              },
            },
          },
        },
      },
      NOT: {
        roles: {
          some: {
            role: {
              active: true,
              permissions: {
                some: {
                  permission: { code: permissionCode },
                  effect: 'DENY',
                },
              },
            },
          },
        },
      },
    },
    select: { id: true, name: true, email: true },
  });
}
