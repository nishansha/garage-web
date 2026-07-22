import { useCallback } from "react";
import {
  canAccess,
  isSessionSuperAdmin,
  type MyPermissions,
  type RbacPrivilege,
} from "../lib/rbac";
import { useAppSelector } from "../store/auth";

export const usePermissions = (): MyPermissions | null =>
  useAppSelector((state) => state.auth.permissions);

export const usePermission = () => {
  const permissions = usePermissions();
  const roleCodes = useAppSelector(
    (state) => state.auth.permissions?.roles ?? state.auth.session?.user?.roles,
  );
  const can = useCallback(
    (resourceCode: string, privilege: RbacPrivilege = "VIEW") =>
      canAccess(permissions, resourceCode, privilege, roleCodes),
    [permissions, roleCodes],
  );
  const superAdmin = isSessionSuperAdmin(permissions, roleCodes);
  return {
    can,
    permissions,
    ready: permissions !== null || superAdmin,
    superAdmin,
  };
};
