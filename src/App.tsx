import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Button, ErrorState, LoadingState } from "./components/ui";
import { reportError } from "./lib/errorReporting";
import "./features/accounting/accounting.css";
import "./features/admin/admin.css";
import "./features/operations/operations.css";
import {
  AppShell,
  AuthGate,
  LoginPage,
  NotFoundPage,
  PlaceholderPage,
} from "./pages";
import { appRoutes } from "./routes/config";
import { usePermission } from "./hooks/usePermission";
import { PermissionsBootstrap } from "./components/PermissionsBootstrap";
import { resolvePathAccess } from "./routes/access";

const lazyNamed = <TModule,>(
  loadModule: () => Promise<TModule>,
  exportName: keyof TModule,
) =>
  lazy(async () => {
    const module = await loadModule();
    return { default: module[exportName] as unknown as ComponentType };
  });

const loadDashboard = () => import("./features/operations/dashboard");
const loadPurchases = () => import("./features/operations/purchases");
const loadSales = () => import("./features/operations/sales");
const loadOutstandings = () => import("./features/operations/outstandings");
const loadInventory = () => import("./features/operations/inventory");
const loadExpenses = () => import("./features/operations/expenses");
const loadAccounting = () => import("./features/accounting/pages");
const loadAudit = () => import("./features/audit/RecycleBinPage");
const loadAdminPages = () => import("./features/admin/AdminPages");
const loadRolePages = () => import("./features/admin/RolePages");
const loadProductManagement = () =>
  import("./features/admin/ProductManagementPage");

const DashboardRoute = lazyNamed(loadDashboard, "DashboardRoute");
const PurchasesListRoute = lazyNamed(loadPurchases, "PurchasesListRoute");
const PurchaseCreateRoute = lazyNamed(loadPurchases, "PurchaseCreateRoute");
const PurchaseDetailRoute = lazyNamed(loadPurchases, "PurchaseDetailRoute");
const PurchaseEditRoute = lazyNamed(loadPurchases, "PurchaseEditRoute");
const PurchasePaymentRoute = lazyNamed(loadPurchases, "PurchasePaymentRoute");
const PurchaseReturnsListRoute = lazyNamed(
  loadPurchases,
  "PurchaseReturnsListRoute",
);
const PurchaseReturnCreateRoute = lazyNamed(
  loadPurchases,
  "PurchaseReturnCreateRoute",
);
const PurchaseReturnDetailRoute = lazyNamed(
  loadPurchases,
  "PurchaseReturnDetailRoute",
);
const PurchaseReturnReceiptRoute = lazyNamed(
  loadPurchases,
  "PurchaseReturnReceiptRoute",
);
const PurchasePayablesRoute = lazyNamed(
  loadOutstandings,
  "PurchasePayablesRoute",
);
const PurchaseReturnReceivablesRoute = lazyNamed(
  loadOutstandings,
  "PurchaseReturnReceivablesRoute",
);
const SalesListRoute = lazyNamed(loadSales, "SalesListRoute");
const SaleCreateRoute = lazyNamed(loadSales, "SaleCreateRoute");
const SaleDetailRoute = lazyNamed(loadSales, "SaleDetailRoute");
const SaleEditRoute = lazyNamed(loadSales, "SaleEditRoute");
const SalePaymentRoute = lazyNamed(loadSales, "SalePaymentRoute");
const SaleReturnCreateRoute = lazyNamed(loadSales, "SaleReturnCreateRoute");
const SaleReturnsListRoute = lazyNamed(loadSales, "SaleReturnsListRoute");
const SaleReturnDetailRoute = lazyNamed(loadSales, "SaleReturnDetailRoute");
const SaleReturnRefundRoute = lazyNamed(loadSales, "SaleReturnRefundRoute");
const SalesReceivablesRoute = lazyNamed(
  loadOutstandings,
  "SalesReceivablesRoute",
);
const SaleReturnPayablesRoute = lazyNamed(
  loadOutstandings,
  "SaleReturnPayablesRoute",
);
const InventoryStockRoute = lazyNamed(loadInventory, "InventoryStockRoute");
const InventorySoldRoute = lazyNamed(loadInventory, "InventorySoldRoute");
const InventoryDetailRoute = lazyNamed(loadInventory, "InventoryDetailRoute");
const GeneralExpensesListRoute = lazyNamed(
  loadExpenses,
  "GeneralExpensesListRoute",
);
const GeneralExpenseCreateRoute = lazyNamed(
  loadExpenses,
  "GeneralExpenseCreateRoute",
);
const GeneralExpenseDetailRoute = lazyNamed(
  loadExpenses,
  "GeneralExpenseDetailRoute",
);
const PurchaseExpensesListRoute = lazyNamed(
  loadExpenses,
  "PurchaseExpensesListRoute",
);
const PurchaseExpenseCreateRoute = lazyNamed(
  loadExpenses,
  "PurchaseExpenseCreateRoute",
);
const PurchaseExpenseDetailRoute = lazyNamed(
  loadExpenses,
  "PurchaseExpenseDetailRoute",
);
const ExpenseEditRoute = lazyNamed(loadExpenses, "ExpenseEditRoute");

const PaymentAccountsPage = lazyNamed(loadAccounting, "PaymentAccountsPage");
const PaymentAccountFormPage = lazyNamed(
  loadAccounting,
  "PaymentAccountFormPage",
);
const PaymentAccountTransactionsPage = lazyNamed(
  loadAccounting,
  "PaymentAccountTransactionsPage",
);
const DirectEntriesPage = lazyNamed(loadAccounting, "DirectEntriesPage");
const DirectEntryFormPage = lazyNamed(loadAccounting, "DirectEntryFormPage");
const JournalsPage = lazyNamed(loadAccounting, "JournalsPage");
const JournalDetailPage = lazyNamed(loadAccounting, "JournalDetailPage");
const JournalFormPage = lazyNamed(loadAccounting, "JournalFormPage");
const GeneralLedgerPage = lazyNamed(loadAccounting, "GeneralLedgerPage");
const TrialBalancePage = lazyNamed(loadAccounting, "TrialBalancePage");
const JournalBalanceSheetPage = lazyNamed(
  loadAccounting,
  "JournalBalanceSheetPage",
);
const JournalProfitLossPage = lazyNamed(
  loadAccounting,
  "JournalProfitLossPage",
);
const ProfitLossReportPage = lazyNamed(loadAccounting, "ProfitLossReportPage");
const MonthlyOverviewPage = lazyNamed(loadAccounting, "MonthlyOverviewPage");
const ChartOfAccountsPage = lazyNamed(loadAccounting, "ChartOfAccountsPage");
const AccountManagementPage = lazyNamed(
  loadAccounting,
  "AccountManagementPage",
);
const RecycleBinPage = lazyNamed(loadAudit, "RecycleBinPage");

const VendorsPage = lazyNamed(loadAdminPages, "VendorsPage");
const CustomersPage = lazyNamed(loadAdminPages, "CustomersPage");
const StaffManagementPage = lazyNamed(loadAdminPages, "StaffManagementPage");
const RolesManagementPage = lazyNamed(loadRolePages, "RolesManagementPage");
const RolePermissionsPage = lazyNamed(loadRolePages, "RolePermissionsPage");
const ClearDataPage = lazyNamed(loadAdminPages, "ClearDataPage");
const ProductManagementPage = lazyNamed(
  loadProductManagement,
  "ProductManagementPage",
);

interface FeatureRoute {
  path: string;
  Page: ComponentType;
}

const operationsRoutes: readonly FeatureRoute[] = [
  { path: "/", Page: DashboardRoute },
  { path: "/purchase/purchases", Page: PurchasesListRoute },
  { path: "/purchase/purchases/new", Page: PurchaseCreateRoute },
  { path: "/purchase/purchases/:purchaseId", Page: PurchaseDetailRoute },
  { path: "/purchase/purchases/:purchaseId/edit", Page: PurchaseEditRoute },
  {
    path: "/purchase/purchases/:purchaseId/payment",
    Page: PurchasePaymentRoute,
  },
  {
    path: "/purchase/purchases/:purchaseId/payments/:paymentId/edit",
    Page: PurchasePaymentRoute,
  },
  { path: "/purchase/returns", Page: PurchaseReturnsListRoute },
  {
    path: "/purchase/returns/new/:inventoryId",
    Page: PurchaseReturnCreateRoute,
  },
  {
    path: "/purchase/returns/:returnId",
    Page: PurchaseReturnDetailRoute,
  },
  {
    path: "/purchase/returns/:returnId/receipt",
    Page: PurchaseReturnReceiptRoute,
  },
  {
    path: "/purchase/returns/:returnId/receipts/:receiptId/edit",
    Page: PurchaseReturnReceiptRoute,
  },
  {
    path: "/purchase/outstandings/payables",
    Page: PurchasePayablesRoute,
  },
  {
    path: "/purchase/outstandings/return-receivables",
    Page: PurchaseReturnReceivablesRoute,
  },
  { path: "/sales/sales", Page: SalesListRoute },
  { path: "/sales/sales/new", Page: SaleCreateRoute },
  { path: "/sales/sales/:saleId", Page: SaleDetailRoute },
  { path: "/sales/sales/:saleId/edit", Page: SaleEditRoute },
  { path: "/sales/sales/:saleId/payment", Page: SalePaymentRoute },
  {
    path: "/sales/sales/:saleId/payments/:paymentId/edit",
    Page: SalePaymentRoute,
  },
  { path: "/sales/sales/:saleId/return", Page: SaleReturnCreateRoute },
  { path: "/sales/returns", Page: SaleReturnsListRoute },
  { path: "/sales/returns/:returnId", Page: SaleReturnDetailRoute },
  {
    path: "/sales/returns/:returnId/refund",
    Page: SaleReturnRefundRoute,
  },
  {
    path: "/sales/returns/:returnId/refunds/:refundId/edit",
    Page: SaleReturnRefundRoute,
  },
  {
    path: "/sales/outstandings/receivables",
    Page: SalesReceivablesRoute,
  },
  {
    path: "/sales/outstandings/return-payables",
    Page: SaleReturnPayablesRoute,
  },
  { path: "/inventory/stock", Page: InventoryStockRoute },
  { path: "/inventory/stock/:inventoryId", Page: InventoryDetailRoute },
  { path: "/inventory/sold", Page: InventorySoldRoute },
  { path: "/inventory/sold/:inventoryId", Page: InventoryDetailRoute },
  { path: "/expenses/general", Page: GeneralExpensesListRoute },
  { path: "/expenses/general/new", Page: GeneralExpenseCreateRoute },
  {
    path: "/expenses/general/:expenseId",
    Page: GeneralExpenseDetailRoute,
  },
  { path: "/expenses/general/:expenseId/edit", Page: ExpenseEditRoute },
  { path: "/expenses/purchase", Page: PurchaseExpensesListRoute },
  {
    path: "/expenses/purchase/:purchaseId",
    Page: PurchaseExpenseDetailRoute,
  },
  {
    path: "/expenses/purchase/:purchaseId/new",
    Page: PurchaseExpenseCreateRoute,
  },
  {
    path: "/expenses/purchase/:purchaseId/:expenseId/edit",
    Page: ExpenseEditRoute,
  },
];

const accountingRoutes: readonly FeatureRoute[] = [
  {
    path: "/accounting/accounts",
    Page: PaymentAccountsPage,
  },
  {
    path: "/accounting/accounts/new",
    Page: PaymentAccountFormPage,
  },
  {
    path: "/accounting/accounts/:accountId/edit",
    Page: PaymentAccountFormPage,
  },
  {
    path: "/accounting/accounts/:accountId/transactions",
    Page: PaymentAccountTransactionsPage,
  },
  {
    path: "/accounting/direct-entry",
    Page: DirectEntriesPage,
  },
  {
    path: "/accounting/direct-entry/new",
    Page: DirectEntryFormPage,
  },
  {
    path: "/accounting/direct-entry/:entryId",
    Page: DirectEntryFormPage,
  },
  { path: "/accounting/journals", Page: JournalsPage },
  {
    path: "/accounting/journals/new",
    Page: JournalFormPage,
  },
  {
    path: "/accounting/journals/:journalId",
    Page: JournalDetailPage,
  },
  {
    path: "/accounting/general-ledger",
    Page: GeneralLedgerPage,
  },
  {
    path: "/accounting/trial-balance",
    Page: TrialBalancePage,
  },
  {
    path: "/accounting/balance-sheet",
    Page: JournalBalanceSheetPage,
  },
  {
    path: "/accounting/journal-profit-and-loss",
    Page: JournalProfitLossPage,
  },
  { path: "/accounting/profit-and-loss", Page: ProfitLossReportPage },
  { path: "/accounting/monthly-overview", Page: MonthlyOverviewPage },
  {
    path: "/accounting/chart-of-accounts",
    Page: ChartOfAccountsPage,
  },
  {
    path: "/more/account-management",
    Page: AccountManagementPage,
  },
];

const adminRoutes: readonly FeatureRoute[] = [
  { path: "/purchase/vendors", Page: VendorsPage },
  { path: "/sales/customers", Page: CustomersPage },
  { path: "/more/recycle-bin", Page: RecycleBinPage },
  { path: "/more/staff", Page: StaffManagementPage },
  { path: "/more/roles", Page: RolesManagementPage },
  { path: "/more/roles/:roleId/permissions", Page: RolePermissionsPage },
  {
    path: "/more/accounts",
    Page: AccountManagementPage,
  },
  {
    path: "/more/products",
    Page: ProductManagementPage,
  },
  { path: "/more/clear-data", Page: ClearDataPage },
];

const featureRoutes = [
  ...operationsRoutes,
  ...accountingRoutes,
  ...adminRoutes,
];
const featurePaths = new Set(featureRoutes.map((route) => route.path));

const FeatureAccess = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { can, ready } = usePermission();
  const access = resolvePathAccess(location.pathname);

  if (ready && access && !can(access.resource, access.privilege)) {
    return (
      <ErrorState
        title="Access restricted"
        message="You do not have permission to view this page."
      />
    );
  }

  if (location.pathname === "/more/accounts") {
    return <Navigate to="/accounting/chart-of-accounts" replace />;
  }

  return children;
};

const LazyPage = ({ Page }: { Page: ComponentType }) => (
  <Suspense fallback={<LoadingState label="Loading page…" />}>
    <Page />
  </Suspense>
);

const renderFeatureRoute = ({ path, Page }: FeatureRoute) => (
  <Route
    key={path}
    path={path}
    element={
      <FeatureAccess>
        <LazyPage Page={Page} />
      </FeatureAccess>
    }
  />
);

interface ErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (this.state.error) {
      return (
        <main className="standalone-state">
          <ErrorState
            title="The application encountered an error"
            message="Reload the page to try again. Your saved session is unaffected."
          />
          <Button onClick={() => window.location.reload()}>
            Reload application
          </Button>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGate />}>
            <Route element={<PermissionsBootstrap />}>
              <Route element={<AppShell />}>
                {featureRoutes.map(renderFeatureRoute)}
                {appRoutes
                  .filter((route) => !featurePaths.has(route.path))
                  .map((route) => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={<PlaceholderPage route={route} />}
                    />
                  ))}
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
