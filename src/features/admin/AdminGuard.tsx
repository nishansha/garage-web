import type { ReactNode } from "react";
import { ErrorState } from "../../components/ui";
import { usePermission } from "../../hooks/usePermission";
import type { RbacPrivilege } from "../../lib/rbac";

type PermissionGuardProps = {
  children: ReactNode;
  resource: string;
  privilege?: RbacPrivilege;
};

export const PermissionGuard = ({
  children,
  resource,
  privilege = "VIEW",
}: PermissionGuardProps) => {
  const { can, ready } = usePermission();

  if (ready && !can(resource, privilege)) {
    return (
      <ErrorState
        title="Access restricted"
        message="You do not have permission to view this page."
      />
    );
  }

  return children;
};
