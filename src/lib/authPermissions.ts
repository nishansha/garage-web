import { store, setPermissions } from "../store/auth";
import { rbacApi } from "../services/rbac";
import type { MyPermissions } from "./rbac";

export const loadSessionPermissions = async (): Promise<MyPermissions> => {
  const permissions = await rbacApi.getMyPermissions();
  store.dispatch(setPermissions(permissions));
  return permissions;
};
