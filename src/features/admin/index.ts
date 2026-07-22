import "./admin.css";

export {
  AccountManagementPage,
  ClearDataPage,
  CustomersPage,
  StaffManagementPage,
  VendorsPage,
} from "./AdminPages";
export { PermissionGuard } from "./AdminGuard";
export { ProductManagementPage } from "./ProductManagementPage";
export { masterDataTypes, type MasterTypeConfig } from "./masterData";

export const ACCOUNT_MANAGEMENT_TARGET = "/accounting/accounts";
