import { api } from "../lib/api";
import type {
  MyPermissions,
  RbacModule,
  RbacPrivilege,
  RoleOption,
  RoleRecord,
  ResourcePermission,
} from "../lib/rbac";

export type CreateRolePayload = {
  code: string;
  name: string;
  description?: string;
};

export type UpdateRolePayload = {
  code: string;
  name: string;
  description?: string;
  version: number;
};

export type RolePrivilegeGrant = {
  resourceId: number;
  privileges: RbacPrivilege[];
};

export const rbacApi = {
  getMyPermissions: () => api.get<MyPermissions>("v1/roles/me/permissions"),

  listRoles: () =>
    api
      .get<{ roles: RoleRecord[] }>("v1/roles")
      .then((result) => result.roles ?? []),

  createRole: (payload: CreateRolePayload) =>
    api.post<{ id: number }>("v1/roles", payload),

  updateRole: (id: number, payload: UpdateRolePayload) =>
    api.put<{ id: number }>(`v1/roles/${id}`, payload),

  deleteRole: (id: number) => api.delete<void>(`v1/roles/${id}`),

  getResources: () => api.get<{ modules: RbacModule[] }>("v1/roles/resources"),

  getRolePrivileges: (roleId: number) =>
    api.get<{ grants: ResourcePermission[] }>(
      `v1/roles/${roleId}/privileges`,
    ),

  replaceRolePrivileges: (roleId: number, grants: RolePrivilegeGrant[]) =>
    api.put<{ grants: ResourcePermission[] }>(
      `v1/roles/${roleId}/privileges`,
      { grants },
    ),
};

export type { RoleOption, RoleRecord };
