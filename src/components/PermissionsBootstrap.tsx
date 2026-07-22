import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { loadSessionPermissions } from "../lib/authPermissions";
import { LoadingState } from "./ui";
import {
  clearSession,
  useAppDispatch,
  useAppSelector,
} from "../store/auth";

export const PermissionsBootstrap = () => {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session);
  const permissions = useAppSelector((state) => state.auth.permissions);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!session) return;
    let active = true;
    setPending(true);
    loadSessionPermissions()
      .catch(() => {
        if (active) dispatch(clearSession());
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [dispatch, session?.token]);

  if (session && pending && !permissions) {
    return <LoadingState label="Loading your access…" />;
  }

  return <Outlet />;
};
