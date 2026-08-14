import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PermissionGroup {
  id: string;
  name: string;
  code: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  groupId: string;
  group: PermissionGroup;
  active: boolean;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission: Permission;
  effect: "ALLOW" | "DENY";
}

export const permissionService = {
  // Catálogo é global e pequeno o bastante pra trazer tudo de uma vez
  // — sem paginação real na tela da matriz.
  async listAll(): Promise<Permission[]> {
    const { data } = await api.get<
      ApiEnvelope<Paginated<Permission>>
    >("/identity/permissions", {
      params: { limit: 500 },
    });

    return data.data.items;
  },

  async listByRole(roleId: string): Promise<RolePermission[]> {
    const { data } = await api.get<
      ApiEnvelope<Paginated<RolePermission>>
    >("/identity/role-permissions", {
      params: { roleId, limit: 500 },
    });

    return data.data.items;
  },

  async grant(
    roleId: string,
    permissionId: string
  ): Promise<RolePermission> {
    const { data } = await api.post<
      ApiEnvelope<RolePermission>
    >("/identity/role-permissions", {
      roleId,
      permissionId,
      effect: "ALLOW",
    });

    return data.data;
  },

  async revoke(rolePermissionId: string): Promise<void> {
    await api.delete(
      `/identity/role-permissions/${rolePermissionId}`
    );
  },
};
