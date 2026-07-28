import type { OperationsRouteMetadata } from "./common";
import { DashboardRoute } from "./dashboard";
import {
  ExpenseEditRoute,
  GeneralExpenseCreateRoute,
  GeneralExpenseDetailRoute,
  GeneralExpensesListRoute,
  PurchaseExpenseCreateRoute,
  PurchaseExpenseDetailRoute,
  PurchaseExpensesListRoute,
} from "./expenses";
import {
  InventoryDetailRoute,
  InventorySoldRoute,
  InventoryStockRoute,
} from "./inventory";
import {
  PurchaseCreateRoute,
  PurchaseDetailRoute,
  PurchaseEditRoute,
  PurchasePaymentRoute,
  PurchaseReturnCreateRoute,
  PurchaseReturnDetailRoute,
  PurchaseReturnReceiptRoute,
  PurchaseReturnsListRoute,
  PurchasesListRoute,
} from "./purchases";
import {
  PurchasePayablesRoute,
  PurchaseReturnReceivablesRoute,
  SaleReturnPayablesRoute,
  SalesRcDueRoute,
  SalesReceivablesRoute,
} from "./outstandings";
import {
  SaleCreateRoute,
  SaleDetailRoute,
  SaleEditRoute,
  SalePaymentRoute,
  SaleRcDueReceiptRoute,
  SaleReturnCreateRoute,
  SaleReturnDetailRoute,
  SaleReturnRefundRoute,
  SaleReturnsListRoute,
  SalesListRoute,
} from "./sales";

export * from "./dashboard";
export * from "./expenses";
export * from "./inventory";
export * from "./outstandings";
export * from "./purchases";
export * from "./sales";

export const operationsRoutes = {
  "/": DashboardRoute,
  "/purchase/purchases": PurchasesListRoute,
  "/purchase/purchases/new": PurchaseCreateRoute,
  "/purchase/purchases/:purchaseId": PurchaseDetailRoute,
  "/purchase/purchases/:purchaseId/edit": PurchaseEditRoute,
  "/purchase/purchases/:purchaseId/payment": PurchasePaymentRoute,
  "/purchase/purchases/:purchaseId/payments/:paymentId/edit":
    PurchasePaymentRoute,
  "/purchase/returns": PurchaseReturnsListRoute,
  "/purchase/returns/new/:inventoryId": PurchaseReturnCreateRoute,
  "/purchase/returns/:returnId": PurchaseReturnDetailRoute,
  "/purchase/returns/:returnId/receipt": PurchaseReturnReceiptRoute,
  "/purchase/returns/:returnId/receipts/:receiptId/edit":
    PurchaseReturnReceiptRoute,
  "/purchase/outstandings/payables": PurchasePayablesRoute,
  "/purchase/outstandings/return-receivables": PurchaseReturnReceivablesRoute,
  "/sales/sales": SalesListRoute,
  "/sales/sales/new": SaleCreateRoute,
  "/sales/sales/:saleId": SaleDetailRoute,
  "/sales/sales/:saleId/edit": SaleEditRoute,
  "/sales/sales/:saleId/payment": SalePaymentRoute,
  "/sales/sales/:saleId/rc-due-receipts/new": SaleRcDueReceiptRoute,
  "/sales/sales/:saleId/rc-due-receipts/:receiptId/edit": SaleRcDueReceiptRoute,
  "/sales/sales/:saleId/payments/:paymentId/edit": SalePaymentRoute,
  "/sales/sales/:saleId/return": SaleReturnCreateRoute,
  "/sales/returns": SaleReturnsListRoute,
  "/sales/returns/:returnId": SaleReturnDetailRoute,
  "/sales/returns/:returnId/refund": SaleReturnRefundRoute,
  "/sales/returns/:returnId/refunds/:refundId/edit": SaleReturnRefundRoute,
  "/sales/outstandings/receivables": SalesReceivablesRoute,
  "/sales/outstandings/rc-due": SalesRcDueRoute,
  "/sales/outstandings/return-payables": SaleReturnPayablesRoute,
  "/inventory/stock": InventoryStockRoute,
  "/inventory/stock/:inventoryId": InventoryDetailRoute,
  "/inventory/sold": InventorySoldRoute,
  "/inventory/sold/:inventoryId": InventoryDetailRoute,
  "/expenses/general": GeneralExpensesListRoute,
  "/expenses/general/new": GeneralExpenseCreateRoute,
  "/expenses/general/:expenseId": GeneralExpenseDetailRoute,
  "/expenses/general/:expenseId/edit": ExpenseEditRoute,
  "/expenses/purchase": PurchaseExpensesListRoute,
  "/expenses/purchase/:purchaseId": PurchaseExpenseDetailRoute,
  "/expenses/purchase/:purchaseId/new": PurchaseExpenseCreateRoute,
  "/expenses/purchase/:purchaseId/:expenseId/edit": ExpenseEditRoute,
} as const;

export const operationsRouteMetadata: readonly OperationsRouteMetadata[] =
  Object.entries(operationsRoutes).map(([path, component]) => {
    const mode = path.includes("/edit")
      ? "edit"
      : path.includes("/payment") ||
          path.includes("/receipt") ||
          path.includes("/refund")
        ? "payment"
        : path.includes("/new") || path.endsWith("/return")
          ? "create"
          : /:\w+/.test(path)
            ? "detail"
            : "list";
    const entity =
      path.startsWith("/purchase/returns") || path.startsWith("/sales/returns")
        ? "return"
        : path.startsWith("/purchase")
          ? "purchase"
          : path.startsWith("/sales")
            ? "sale"
            : path.startsWith("/inventory")
              ? "inventory"
              : path.startsWith("/expenses")
                ? "expense"
                : undefined;
    return {
      path,
      component,
      title:
        path === "/"
          ? "Dashboard"
          : path
              .split("/")
              .filter(Boolean)
              .map((part) =>
                part.startsWith(":") ? "Detail" : part.replaceAll("-", " "),
              )
              .join(" / "),
      entity,
      mode,
    };
  });
