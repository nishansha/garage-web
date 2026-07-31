import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { loadSessionPermissions } from "../lib/authPermissions";
import {
  DEFAULT_PREFERENCES,
  preferencesApi,
} from "../services/preferences";
import { LoadingState } from "./ui";
import {
  clearSession,
  setPreferences,
  useAppDispatch,
  useAppSelector,
} from "../store/auth";

export const PermissionsBootstrap = () => {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session);
  const permissions = useAppSelector((state) => state.auth.permissions);
  const preferences = useAppSelector((state) => state.auth.preferences);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!session) return;
    let active = true;
    setPending(true);

    const loadPreferences = preferencesApi
      .get()
      .then((value) => {
        if (active) dispatch(setPreferences(value));
      })
      .catch(() => {
        if (active) dispatch(setPreferences(DEFAULT_PREFERENCES));
      });

    const loadPermissions = loadSessionPermissions().catch(() => {
      if (active) dispatch(clearSession());
    });

    void Promise.all([loadPermissions, loadPreferences]).finally(() => {
      if (active) setPending(false);
    });

    return () => {
      active = false;
    };
  }, [dispatch, session?.token]);

  if (session && pending && (!permissions || !preferences)) {
    return <LoadingState label="Loading your access…" />;
  }

  return <Outlet />;
};
