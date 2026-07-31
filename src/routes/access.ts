import type { RbacPrivilege } from "../lib/rbac";

export interface RouteAccess {
  resource: string;
  privilege: RbacPrivilege;
}

type AccessRule = {
  pattern: RegExp;
  access: RouteAccess;
};

const rules: AccessRule[] = [
  { pattern: /^\/$/, access: { resource: "REPORT", privilege: "VIEW" } },
  {
    pattern: /^\/purchase\/purchases\/new$/,
    access: { resource: "PURCHASE_ORDER", privilege: "CREATE" },
  },
  {
    pattern: /^\/purchase\/purchases\/\d+\/edit$/,
    access: { resource: "PURCHASE_ORDER", privilege: "UPDATE" },
  },
  {
    pattern: /^\/purchase\/purchases\/\d+\/payments?/,
    access: { resource: "PURCHASE_PAYMENT", privilege: "CREATE" },
  },
  {
    pattern: /^\/purchase\/purchases\/\d+\/rc-due-receipts\/new$/,
    access: { resource: "PURCHASE_PAYMENT", privilege: "CREATE" },
  },
  {
    pattern: /^\/purchase\/purchases\/\d+\/rc-due-receipts\/\d+\/edit$/,
    access: { resource: "PURCHASE_PAYMENT", privilege: "UPDATE" },
  },
  {
    pattern: /^\/purchase\/purchases/,
    access: { resource: "PURCHASE_ORDER", privilege: "VIEW" },
  },
  {
    pattern: /^\/purchase\/returns\/new\//,
    access: { resource: "PURCHASE_RETURN", privilege: "CREATE" },
  },
  {
    pattern: /^\/purchase\/returns\/\d+\/receipt/,
    access: { resource: "PURCHASE_RETURN", privilege: "CREATE" },
  },
  {
    pattern: /^\/purchase\/returns/,
    access: { resource: "PURCHASE_RETURN", privilege: "VIEW" },
  },
  {
    pattern: /^\/purchase\/vendors/,
    access: { resource: "VENDOR", privilege: "VIEW" },
  },
  {
    pattern: /^\/purchase\/outstandings\/payables/,
    access: { resource: "PURCHASE_PAYABLE", privilege: "VIEW" },
  },
  {
    pattern: /^\/purchase\/outstandings\/return-receivables/,
    access: { resource: "PURCHASE_RETURN_RECEIVABLE", privilege: "VIEW" },
  },
  {
    pattern: /^\/purchase\/outstandings\/rc-due/,
    access: { resource: "PURCHASE_PAYABLE", privilege: "VIEW" },
  },
  {
    pattern: /^\/sales\/sales\/new$/,
    access: { resource: "SALE", privilege: "CREATE" },
  },
  {
    pattern: /^\/sales\/sales\/\d+\/edit$/,
    access: { resource: "SALE", privilege: "UPDATE" },
  },
  {
    pattern: /^\/sales\/sales\/\d+\/payment/,
    access: { resource: "SALE", privilege: "CREATE" },
  },
  {
    pattern: /^\/sales\/sales\/\d+\/return$/,
    access: { resource: "SALE_RETURN", privilege: "CREATE" },
  },
  {
    pattern: /^\/sales\/sales/,
    access: { resource: "SALE", privilege: "VIEW" },
  },
  {
    pattern: /^\/sales\/returns\/\d+\/refund/,
    access: { resource: "SALE_RETURN", privilege: "CREATE" },
  },
  {
    pattern: /^\/sales\/returns/,
    access: { resource: "SALE_RETURN", privilege: "VIEW" },
  },
  {
    pattern: /^\/sales\/customers/,
    access: { resource: "CUSTOMER", privilege: "VIEW" },
  },
  {
    pattern: /^\/sales\/outstandings\/receivables/,
    access: { resource: "SALE_RECEIVABLE", privilege: "VIEW" },
  },
  {
    pattern: /^\/sales\/outstandings\/return-payables/,
    access: { resource: "SALE_RETURN_PAYABLE", privilege: "VIEW" },
  },
  {
    pattern: /^\/inventory\/sold/,
    access: { resource: "SOLD", privilege: "VIEW" },
  },
  {
    pattern: /^\/inventory\/stock/,
    access: { resource: "STOCK", privilege: "VIEW" },
  },
  {
    pattern: /^\/expenses\/general\/new$/,
    access: { resource: "EXPENSE_GENERAL", privilege: "CREATE" },
  },
  {
    pattern: /^\/expenses\/general\/\d+\/edit$/,
    access: { resource: "EXPENSE_GENERAL", privilege: "UPDATE" },
  },
  {
    pattern: /^\/expenses\/general/,
    access: { resource: "EXPENSE_GENERAL", privilege: "VIEW" },
  },
  {
    pattern: /^\/expenses\/purchase\/\d+\/new$/,
    access: { resource: "EXPENSE_PURCHASE", privilege: "CREATE" },
  },
  {
    pattern: /^\/expenses\/purchase\/\d+\/\d+\/edit$/,
    access: { resource: "EXPENSE_PURCHASE", privilege: "UPDATE" },
  },
  {
    pattern: /^\/expenses\/purchase/,
    access: { resource: "EXPENSE_PURCHASE", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/accounts\/new$/,
    access: { resource: "PAYMENT_ACCOUNT", privilege: "CREATE" },
  },
  {
    pattern: /^\/accounting\/accounts\/\d+\/edit$/,
    access: { resource: "PAYMENT_ACCOUNT", privilege: "UPDATE" },
  },
  {
    pattern: /^\/accounting\/accounts/,
    access: { resource: "PAYMENT_ACCOUNT", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/direct-entry\/new$/,
    access: { resource: "DIRECT_ENTRY", privilege: "CREATE" },
  },
  {
    pattern: /^\/accounting\/direct-entry\/\d+$/,
    access: { resource: "DIRECT_ENTRY", privilege: "UPDATE" },
  },
  {
    pattern: /^\/accounting\/direct-entry/,
    access: { resource: "DIRECT_ENTRY", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/other-income\/new$/,
    access: { resource: "OTHER_INCOME", privilege: "CREATE" },
  },
  {
    pattern: /^\/accounting\/other-income\/\d+$/,
    access: { resource: "OTHER_INCOME", privilege: "UPDATE" },
  },
  {
    pattern: /^\/accounting\/other-income/,
    access: { resource: "OTHER_INCOME", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/journals\/new$/,
    access: { resource: "JOURNAL", privilege: "CREATE" },
  },
  {
    pattern: /^\/accounting\/journals\/\d+$/,
    access: { resource: "JOURNAL", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/journals/,
    access: { resource: "JOURNAL", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/general-ledger/,
    access: { resource: "GENERAL_LEDGER", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/trial-balance/,
    access: { resource: "TRIAL_BALANCE", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/balance-sheet/,
    access: { resource: "BALANCE_SHEET", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/journal-profit-and-loss/,
    access: { resource: "PL_REPORT", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/profit-and-loss/,
    access: { resource: "MONTHLY_REPORT", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/monthly-overview/,
    access: { resource: "MONTHLY_REPORT", privilege: "VIEW" },
  },
  {
    pattern: /^\/accounting\/chart-of-accounts/,
    access: { resource: "ACCOUNT", privilege: "VIEW" },
  },
  {
    pattern: /^\/more\/account-management/,
    access: { resource: "ACCOUNT", privilege: "VIEW" },
  },
  {
    pattern: /^\/more\/recycle-bin/,
    access: { resource: "RECYCLE_BIN", privilege: "VIEW" },
  },
  {
    pattern: /^\/more\/roles\/\d+\/permissions$/,
    access: { resource: "ROLE", privilege: "VIEW" },
  },
  {
    pattern: /^\/more\/roles/,
    access: { resource: "ROLE", privilege: "VIEW" },
  },
  {
    pattern: /^\/more\/staff/,
    access: { resource: "USER", privilege: "VIEW" },
  },
  {
    pattern: /^\/more\/products/,
    access: { resource: "PRODUCT", privilege: "VIEW" },
  },
  {
    pattern: /^\/more\/clear-data/,
    access: { resource: "DATA_RESET", privilege: "DELETE" },
  },
];

export const resolvePathAccess = (pathname: string): RouteAccess | null => {
  const path = pathname.split("?")[0];
  for (const rule of rules) {
    if (rule.pattern.test(path)) return rule.access;
  }
  return null;
};

export const routeNavAccess = (path: string): RouteAccess | null =>
  resolvePathAccess(path);
