import type { ReactNode } from "react";
import { usePermission } from "../hooks/usePermission";
import type { RbacPrivilege } from "../lib/rbac";

type CanProps = {
  resource: string;
  privilege?: RbacPrivilege;
  children: ReactNode;
  fallback?: ReactNode;
};

/** Renders children only when the current user has the given permission. */
export const Can = ({
  resource,
  privilege = "VIEW",
  children,
  fallback = null,
}: CanProps) => {
  const { can, ready } = usePermission();
  if (!ready || !can(resource, privilege)) return fallback;
  return children;
};
