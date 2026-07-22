export type RbacPrivilege =
  | "VIEW"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "EXPORT";

export interface ResourcePermission {
  resourceId: number;
  resourceCode: string;
  privileges: string[];
}

export interface MyPermissions {
  superAdmin: boolean;
  roles: string[];
  permissions: ResourcePermission[];
}

export interface RoleOption {
  id: number;
  code: string;
  name: string;
  description?: string;
  system?: boolean;
  version?: number;
}

export type RoleRecord = RoleOption & {
  system: boolean;
  version: number;
};

export interface RbacResource {
  id: number;
  code: string;
  description: string;
}

export interface RbacModule {
  id: number;
  code: string;
  description: string;
  resources: RbacResource[];
}

export const RBAC_PRIVILEGES: readonly RbacPrivilege[] = [
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE",
  "EXPORT",
];

export const isSuperAdminRoleCode = (code: string): boolean =>
  code.toUpperCase() === "SUPERADMIN";

export const isSessionSuperAdmin = (
  permissions: MyPermissions | null | undefined,
  roleCodes?: string[] | null,
): boolean =>
  Boolean(permissions?.superAdmin) ||
  (roleCodes?.some((code) => isSuperAdminRoleCode(code)) ?? false);

export const isSystemRole = (
  role: Pick<RoleOption, "system" | "code">,
): boolean => Boolean(role.system);

export const hasAnyRolePrivilege = (
  can: (resource: string, privilege: RbacPrivilege) => boolean,
): boolean =>
  RBAC_PRIVILEGES.some((privilege) => can("ROLE", privilege));

export const canAccess = (
  state: MyPermissions | null | undefined,
  resourceCode: string,
  privilege: RbacPrivilege,
  roleCodes?: string[] | null,
): boolean => {
  if (isSessionSuperAdmin(state, roleCodes)) return true;
  if (!state) return false;
  const entry = state.permissions.find((p) => p.resourceCode === resourceCode);
  return entry?.privileges.includes(privilege) ?? false;
};

export const formatRoleLabels = (roles: string[] | undefined): string => {
  if (!roles?.length) return "User";
  return roles
    .map((code) =>
      code
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    )
    .join(", ");
};

export const FORBIDDEN_MESSAGE =
  "You do not have permission to perform this action.";

export const isForbiddenError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const record = error as { status?: number; code?: string };
  return record.status === 403 || record.code === "SEC_106";
};

/**
 * RBAC follow-ups (web UI — action-level `Can` gating not yet applied):
 * - Report / ledger export buttons → `EXPORT` on the matching resource
 *   (MONTHLY_REPORT, PL_REPORT, TRIAL_BALANCE, BALANCE_SHEET, GENERAL_LEDGER, …).
 * - Payment account transactions: Adjustment + Reconcile → likely `PAYMENT_ACCOUNT` UPDATE.
 */
export const RBAC_UI_FOLLOW_UPS = [
  "export-buttons",
  "payment-account-adjustment-reconcile",
] as const;
