import type { ReactNode } from "react";
import { ErrorState } from "../../components/ui";
import { useAppSelector } from "../../store/auth";

export const AdminGuard = ({ children }: { children: ReactNode }) => {
  const isAdmin = useAppSelector(
    (state) => state.auth.session?.user.role?.toUpperCase() === "ADMIN",
  );

  if (!isAdmin) {
    return (
      <ErrorState
        title="Access restricted"
        message="This area is available to administrators only."
      />
    );
  }

  return children;
};
