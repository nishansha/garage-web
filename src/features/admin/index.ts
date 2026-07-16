import type { ComponentType } from "react";
import {
  AccountManagementPage,
  ClearDataPage,
  CustomersPage,
  StaffManagementPage,
  VendorsPage,
} from "./AdminPages";
import { ProductManagementPage } from "./ProductManagementPage";
import "./admin.css";

export {
  AccountManagementPage,
  ClearDataPage,
  CustomersPage,
  StaffManagementPage,
  VendorsPage,
} from "./AdminPages";
export { AdminGuard } from "./AdminGuard";
export { ProductManagementPage } from "./ProductManagementPage";
export { masterDataTypes, type MasterTypeConfig } from "./masterData";

export interface AdminRouteManifestEntry {
  path: string;
  title: string;
  adminOnly: boolean;
  Page: ComponentType;
}

export const ACCOUNT_MANAGEMENT_TARGET = "/accounting/accounts";

export const adminRouteManifest: readonly AdminRouteManifestEntry[] = [
  {
    path: "/purchase/vendors",
    title: "Vendors",
    adminOnly: false,
    Page: VendorsPage,
  },
  {
    path: "/sales/customers",
    title: "Customers",
    adminOnly: false,
    Page: CustomersPage,
  },
  {
    path: "/more/staff",
    title: "Staff Management",
    adminOnly: true,
    Page: StaffManagementPage,
  },
  {
    path: "/more/accounts",
    title: "Account Management",
    adminOnly: true,
    Page: AccountManagementPage,
  },
  {
    path: "/more/products",
    title: "Product Management",
    adminOnly: true,
    Page: ProductManagementPage,
  },
  {
    path: "/more/clear-data",
    title: "Clear Data",
    adminOnly: true,
    Page: ClearDataPage,
  },
] as const;
