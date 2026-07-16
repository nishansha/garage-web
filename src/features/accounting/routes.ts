import type { ComponentType } from "react";
import {
  AccountManagementPage,
  ChartOfAccountsPage,
  DirectEntriesPage,
  DirectEntryFormPage,
  GeneralLedgerPage,
  JournalBalanceSheetPage,
  JournalDetailPage,
  JournalFormPage,
  JournalProfitLossPage,
  JournalsPage,
  MonthlyOverviewPage,
  PaymentAccountFormPage,
  PaymentAccountsPage,
  PaymentAccountTransactionsPage,
  ProfitLossReportPage,
  TrialBalancePage,
} from "./pages";

export interface AccountingRouteComponent {
  path: string;
  component: ComponentType;
  adminOnly?: boolean;
}

export const accountingRouteComponents: readonly AccountingRouteComponent[] = [
  {
    path: "/accounting/accounts",
    component: PaymentAccountsPage,
    adminOnly: true,
  },
  {
    path: "/accounting/accounts/new",
    component: PaymentAccountFormPage,
    adminOnly: true,
  },
  {
    path: "/accounting/accounts/:accountId/edit",
    component: PaymentAccountFormPage,
    adminOnly: true,
  },
  {
    path: "/accounting/accounts/:accountId/transactions",
    component: PaymentAccountTransactionsPage,
    adminOnly: true,
  },
  {
    path: "/accounting/direct-entry",
    component: DirectEntriesPage,
    adminOnly: true,
  },
  {
    path: "/accounting/direct-entry/new",
    component: DirectEntryFormPage,
    adminOnly: true,
  },
  {
    path: "/accounting/direct-entry/:entryId",
    component: DirectEntryFormPage,
    adminOnly: true,
  },
  { path: "/accounting/journals", component: JournalsPage, adminOnly: true },
  {
    path: "/accounting/journals/new",
    component: JournalFormPage,
    adminOnly: true,
  },
  {
    path: "/accounting/journals/:journalId",
    component: JournalDetailPage,
    adminOnly: true,
  },
  {
    path: "/accounting/general-ledger",
    component: GeneralLedgerPage,
    adminOnly: true,
  },
  {
    path: "/accounting/trial-balance",
    component: TrialBalancePage,
    adminOnly: true,
  },
  {
    path: "/accounting/balance-sheet",
    component: JournalBalanceSheetPage,
    adminOnly: true,
  },
  {
    path: "/accounting/journal-profit-and-loss",
    component: JournalProfitLossPage,
    adminOnly: true,
  },
  { path: "/accounting/profit-and-loss", component: ProfitLossReportPage },
  { path: "/accounting/monthly-overview", component: MonthlyOverviewPage },
  {
    path: "/accounting/chart-of-accounts",
    component: ChartOfAccountsPage,
    adminOnly: true,
  },
  {
    path: "/more/account-management",
    component: AccountManagementPage,
    adminOnly: true,
  },
] as const;
