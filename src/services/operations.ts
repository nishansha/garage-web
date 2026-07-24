import { api } from "../lib/api";

export type Id = number;
export type PaymentMethod = "CASH" | "BANK";
export type PaymentStatus = "PENDING" | "UNPAID" | "PAID" | "PARTIAL";
export type SalePaymentStatus =
  "PENDING" | "PAID" | "PARTIAL" | "FINANCE_PENDING" | "REFUND";
export type ReturnStatus = "PENDING" | "COMPLETED" | "PARTIAL";
export type PayerType = "CUSTOMER" | "FINANCE";
export type ExchangeHandling = "KEEP_AND_BUYBACK" | "RETURN_TO_BUYER" | "NONE";

export interface Page<T> {
  totalPages: number;
  totalElements: number | null;
  purchases?: T[];
  sales?: T[] | null;
  products?: T[];
  expenses?: T[];
  purchasesReturns?: T[] | null;
  saleReturns?: T[] | null;
}
export interface Lookup {
  id: number;
  name: string;
  code?: string;
  label?: string;
  description?: string;
}
export interface PaymentAccount {
  id: number;
  name: string;
  bankName?: string | null;
  accountType: "CASH" | "BANK" | "CHEQUE";
  active: boolean;
  openingBalance?: number | null;
  currentBalance?: number | null;
}
export interface Payment {
  id: number;
  version: number;
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod;
  paymentAccountId: number;
  payerType?: PayerType;
  referenceNo?: string | null;
  notes?: string | null;
}
export interface PaymentInput {
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentAccountId: number;
  payerType?: PayerType;
  referenceNo?: string;
  notes?: string;
  version?: number;
}
export interface PurchaseExpenseInput {
  id?: number;
  date: string;
  typeId: number;
  description: string;
  amount?: number;
  paymentAccountId: number;
}
export interface Purchase {
  id: number;
  inventoryId?: number;
  version: number;
  date: string;
  deliveredDate?: string | null;
  vehicleNo: string;
  code: string | null;
  notes?: string | null;
  brandId: number;
  modelId: number;
  variantId: number;
  colorId?: number | null;
  fuelTypeId?: number | null;
  transmissionTypeId?: number | null;
  segmentId?: number | null;
  warehouseId?: number | null;
  brandName: string;
  modelName: string;
  variantName: string;
  colorName?: string | null;
  fuelType?: string | null;
  transmissionType?: string | null;
  segmentName?: string | null;
  warehouseName?: string | null;
  makeYear: number | null;
  odometer: number | null;
  ownerShipSerialNo: string | null;
  purchaseRate: number;
  totalCost: number;
  pickupStaffId: number | null;
  pickupStaff: string | null;
  pickupLocation: string | null;
  ownerName: string | null;
  ownerMobileNo: string | null;
  expenses: PurchaseExpenseInput[] | null;
  sold: boolean;
  returned?: boolean;
  exchange?: boolean;
  editable?: boolean;
  paymentStatus?: PaymentStatus | null;
  paidAmount?: number | null;
  pendingAmount?: number | null;
  payments?: Payment[] | null;
}
export interface PurchaseInput {
  date: string;
  deliveredDate?: string | null;
  vehicleNo: string;
  notes?: string;
  modelId: number;
  brandId: number;
  variantId: number;
  colorId: number;
  fuelTypeId: number;
  transmissionTypeId: number;
  segmentId: number;
  warehouseId: number;
  makeYear: string;
  odometer: string;
  purchaseRate: number;
  pickupStaffId?: number;
  pickupLocation: string;
  ownerName: string;
  ownerMobileNo: string;
  ownerShipSerialNo: string;
  expenses: PurchaseExpenseInput[];
  version?: number;
}
export interface AmountSplit {
  id?: number;
  typeId: number;
  typeDesc?: string | null;
  amount: number;
}
export interface ExchangeExpense {
  id?: number | null;
  version?: number;
  date: string;
  typeId: number;
  description: string;
  amount: number;
  paymentAccountId: number;
}
export interface ExchangeVehicleInput {
  id?: number;
  version?: number;
  vehicleNo: string;
  modelId: number;
  brandId: number;
  variantId: number;
  colorId: number;
  fuelTypeId: number;
  transmissionTypeId: number;
  segmentId: number;
  warehouseId: number;
  makeYear: string;
  odometer: string;
  purchaseRate: number;
  ownerShipSerialNo: string;
  expenses: ExchangeExpense[];
}
export interface SaleExchangeVehicleDetails {
  id: number;
  version: number;
  date: string;
  deliveredDate?: string | null;
  code?: string | null;
  vehicleNo: string;
  inventoryId?: number | null;
  warehouseId?: number | null;
  segmentId?: number | null;
  brandId: number;
  modelId: number;
  variantId: number;
  colorId?: number | null;
  fuelTypeId?: number | null;
  transmissionTypeId?: number | null;
  transmissionType?: string | null;
  makeYear?: string | null;
  odometer?: string | null;
  purchaseRate: number;
  ownerShipSerialNo?: string | null;
  expenses?: ExchangeExpense[] | null;
}
export interface Sale {
  id: number;
  version: number;
  date: string;
  deliveredDate?: string;
  stockId?: number | null;
  customerName: string | null;
  customerMobileNo: string | null;
  customerAddress?: string | null;
  vehicleNo: string;
  brandName: string;
  modelName: string;
  variantName: string;
  saleRate: number;
  profit: number;
  exchange: boolean;
  exchangeAmount?: number | null;
  exchangeVehicleDetails?: SaleExchangeVehicleDetails | null;
  financed: boolean;
  paymentStatus?: SalePaymentStatus | null;
  paidAmount?: number | null;
  pendingAmount?: number | null;
  paidFinanceAmount?: number | null;
  pendingFinanceAmount?: number | null;
  paidCustomerAmount?: number | null;
  pendingCustomerAmount?: number | null;
  financeCompany?: string | null;
  financeAmount?: number | null;
  emiAmount?: number | null;
  amountSplits?: AmountSplit[] | null;
  payments?: Payment[] | null;
}
export interface SaleInput {
  date: string;
  stockId: number;
  saleRate: number;
  customerName: string;
  paymentStatus: SalePaymentStatus;
  customerMobileNo: string;
  customerAddress: string;
  isExchanged: boolean;
  exchangeVehicleDetails?: ExchangeVehicleInput | null;
  exchangeAmount?: number | null;
  isFinanced: boolean;
  financeCompany?: string | null;
  financeAmount?: number | null;
  emiAmount?: number | null;
  amountSplits?: AmountSplit[];
  version?: number;
}
export interface Stock {
  productId: number;
  vendorName?: string | null;
  vendorMobileNo?: string | null;
  purchaseDate: string;
  productCode: string;
  brandName: string;
  modelName: string;
  variantName: string;
  totalAmount: number | null;
  purchasedAmount: number;
  purchaseExpense: number;
  status?: string;
  color?: string | null;
  fuelTypeId?: number | null;
  fuelType?: string | null;
  odometer?: number | null;
  landedCost?: number | null;
  soldAmount?: number | null;
  saleRate?: number | null;
  profit?: number | null;
  soldDate?: string | null;
  customerName?: string | null;
  customerMobileNo?: string | null;
  expenses?: PurchaseExpenseInput[] | null;
}
export interface Expense {
  id: number;
  version: number;
  date: string;
  title: string;
  description: string;
  amount: number;
  typeId?: number;
  typeDesc?: string;
  paymentAccountId?: number | null;
  type?: string;
  expenseType?: string;
}
export interface ExpenseInput {
  date: string;
  amount: number;
  description: string;
  typeId: number;
  paymentAccountId: number;
  purchaseId?: number;
  version?: number;
}
export interface PurchaseExpenseSummary {
  id: number;
  date: string;
  vehicleNo: string;
  code: string | null;
  brandName: string;
  modelName: string;
  variantName: string;
  purchaseRate: number;
  totalExpenses: number;
  totalCost?: number | null;
  sold: boolean;
}
export interface PurchaseReturn {
  id: number;
  version: number;
  purchaseId: number;
  purchaseReferenceNo?: string | null;
  inventoryId: number;
  uin: string;
  vehicleNo?: string | null;
  vendorName?: string | null;
  returnDate: string;
  reason: string;
  notes?: string | null;
  inventoryLandedCost: number;
  vendorInvoiceAmount?: number | null;
  paidToVendor?: number | null;
  outstandingAp?: number | null;
  refundAmount: number;
  lossOnReturn: number;
  status: ReturnStatus;
  receipts: Payment[];
  totalReceived: number;
  remainingReceivable: number;
}
export interface PurchaseReturnFormData {
  inventoryId: number;
  uin: string;
  vehicleNo: string;
  purchaseId: number;
  purchaseReferenceNo: string;
  vendorName: string;
  purchaseDate: string;
  inventoryLandedCost: number;
  vendorInvoiceAmount: number;
  paidToVendor: number;
  outstandingAp: number;
  suggestedRefundAmount: number;
  maxRefundAmount: number;
}
export interface Deduction {
  expenseId?: number | null;
  description: string;
  amount: number;
}
export interface SaleReturn {
  id: number;
  version: number;
  saleId: number;
  invoiceNo: string;
  returnDate: string;
  reason: string;
  notes?: string | null;
  customerPaidAmount: number;
  exchangeHandling: ExchangeHandling;
  exchangeBuybackAmount?: number | null;
  soldVehicleDeductionAmount: number;
  exchangeVehicleDeductionAmount: number;
  refundAmount: number;
  status: ReturnStatus;
  deductions?: Array<
    Deduction & { id: number; vehicleContext: "SOLD" | "EXCHANGE" }
  >;
  refunds?: Payment[];
  totalRefunded: number;
  remainingRefund: number;
}
export interface SaleReturnFormData {
  saleId: number;
  invoiceNo: string;
  saleDate: string;
  saleRate: number;
  customerPaidAmount: number;
  isFinanced: boolean;
  soldVehicle: {
    inventoryId: number;
    uin: string;
    landedCost: number;
    expenses: Array<{ expenseId: number; description: string; amount: number }>;
  };
  exchangeVehicle?: {
    purchaseId: number;
    inventoryId: number;
    uin: string;
    originalExchangeAmount: number;
    currentLandedCost: number;
    expenses: Array<{ expenseId: number; description: string; amount: number }>;
  } | null;
}
export interface OutstandingItem {
  purchaseId?: number;
  purchaseReturnId?: number;
  saleId?: number;
  saleReturnId?: number;
  referenceNo?: string;
  purchaseReferenceNo?: string;
  invoiceNo?: string;
  vehicleNo: string;
  purchaseDate?: string;
  returnDate?: string;
  saleDate?: string;
  amount?: number;
  refundAmount?: number;
  cashRefundExpected?: number;
  pendingAmount: number;
  lastPaymentDate?: string | null;
  lastReceiptDate?: string | null;
  lastRefundDate?: string | null;
  vendorName?: string;
  vendorMobile?: string;
  customerName?: string;
  customerMobile?: string;
}
export interface Outstandings {
  totalCount: number;
  totalPendingAmount: number;
  items: OutstandingItem[];
}
export interface DashboardSummary {
  totalSales: string;
  salesDelta: number;
  totalPurchase: string;
  purchasesDelta: number;
  totalExpenses: string;
  expensesDelta: number;
  totalProfit: string;
  profitDelta: number;
}
export interface DashboardMonth {
  month: string;
  totalSales: number;
  totalPurchase: number;
  totalExpenses: number;
  totalProfit: number;
}
export interface DashboardActivity {
  activityType: "SALE" | "PURCHASE" | "EXPENSE";
  description: string;
  dateTime: string;
  txnType: "C" | "D";
  txnAmount: string;
}

const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : "";
};
const cleanPayment = (value: PaymentInput) => ({
  amount: value.amount,
  paymentDate: value.paymentDate,
  paymentMethod: value.paymentMethod,
  paymentAccountId: value.paymentAccountId,
  ...(value.payerType ? { payerType: value.payerType } : {}),
  ...(value.version !== undefined ? { version: value.version } : {}),
  ...(value.referenceNo?.trim()
    ? { referenceNo: value.referenceNo.trim() }
    : {}),
  ...(value.notes?.trim() ? { notes: value.notes.trim() } : {}),
});
export interface SearchInput {
  searchText?: string;
  fromDate?: string;
  toDate?: string;
  brandId?: number;
  modelId?: number;
  variantId?: number;
  fuelTypeId?: number;
  staffId?: number | null;
  vehicleNo?: string;
  status?: string;
  typeId?: number;
}

export const operationsApi = {
  dashboard: {
    summary: () => api.get<DashboardSummary>("v1/home/summary"),
    overview: (months: number) =>
      api.get<{ data: DashboardMonth[] }>(`v1/home/overview?months=${months}`),
    charts: (type: "SALE" | "PROFIT") =>
      api.get<{ topProducts: Array<{ name: string; value: string }> }>(
        `v1/home/charts?type=${type}`,
      ),
    activities: () =>
      api.get<{ activities: DashboardActivity[] }>("v1/home/activities"),
  },
  lookups: (type: string) =>
    api
      .get<{
        values?: Array<Partial<Lookup> & Pick<Lookup, "id">>;
      }>(`v1/lookup?type=${encodeURIComponent(type)}`)
      .then((result): Lookup[] =>
        (result.values ?? []).map((value) => ({
          ...value,
          name:
            value.name ?? value.description ?? value.label ?? value.code ?? "",
        })),
      ),
  paymentAccounts: () =>
    api
      .get<{ accounts: PaymentAccount[] }>("v1/payment-accounts/balance")
      .then((result) => result.accounts.filter((account) => account.active)),
  catalog: {
    brands: () =>
      api
        .get<{
          brands: Array<{ id: number; code: string; description: string }>;
        }>("v1/product/categories/1/brands")
        .then((result) =>
          result.brands.map((item) => ({
            id: item.id,
            name: item.description,
            code: item.code,
          })),
        ),
    models: (brandId: number) =>
      api
        .get<{
          models: Array<{ id: number; code: string; description: string }>;
        }>(`v1/product/categories/1/brands/${brandId}/models`)
        .then((result) =>
          result.models.map((item) => ({
            id: item.id,
            name: item.description,
            code: item.code,
          })),
        ),
    variants: (brandId: number, modelId: number) =>
      api
        .get<{
          varients: Array<{ id: number; code: string; description: string }>;
        }>(
          `v1/product/categories/1/brands/${brandId}/models/${modelId}/varients`,
        )
        .then((result) =>
          result.varients.map((item) => ({
            id: item.id,
            name: item.description,
            code: item.code,
          })),
        ),
    segments: () =>
      api
        .get<{
          segments: Array<{ id: number; code: string; description: string }>;
        }>("v1/product/categories/1/segments")
        .then((result) =>
          result.segments.map((item) => ({
            id: item.id,
            name: item.description,
            code: item.code,
          })),
        ),
    expenseAccounts: () =>
      api
        .get<{
          accounts: Array<{
            id: number;
            name: string;
            label: string;
            description: string;
          }>;
        }>("v1/account?type=EXPENSE&directPostable=true")
        .then((result) =>
          result.accounts.map((item) => ({
            id: item.id,
            name: item.label || item.name || item.description,
          })),
        ),
    staff: () =>
      api
        .get<{
          users: Array<{
            id: number;
            fullName?: string;
            name?: string;
            username?: string;
          }>;
        }>("v1/user")
        .then((result) =>
          result.users.map((item) => ({
            id: item.id,
            name:
              item.fullName ?? item.name ?? item.username ?? `Staff ${item.id}`,
          })),
        ),
  },
  purchases: {
    list: (page = 0, size = 20, filters?: SearchInput) =>
      filters &&
      Object.values(filters).some(
        (value) => value !== undefined && value !== "",
      )
        ? api.post<Page<Purchase>>(
            `v1/purchase/find?page=${page}&size=${size}`,
            filters,
          )
        : api.get<Page<Purchase>>(`v1/purchase?page=${page}&size=${size}`),
    detail: (id: number) => api.get<Purchase>(`v1/purchase/${id}`),
    create: (value: PurchaseInput) => api.post<Purchase>("v1/purchase", value),
    update: (id: number, value: PurchaseInput & { version: number }) =>
      api.put<Page<Purchase>>(`v1/purchase/${id}`, {
        ...value,
        amount: value.purchaseRate,
      }),
    delete: (id: number) => api.delete<void>(`v1/purchase/${id}`),
    payment: (id: number, value: PaymentInput) =>
      api.post<void>(`v1/purchase/${id}/payments`, cleanPayment(value)),
    updatePayment: (
      id: number,
      paymentId: number,
      value: PaymentInput & { version: number },
    ) =>
      api.put<void>(
        `v1/purchase/${id}/payments/${paymentId}`,
        cleanPayment(value),
      ),
    payables: () => api.get<Outstandings>("v1/purchase/payables"),
  },
  purchaseReturns: {
    list: (page = 0, size = 20, filters?: SearchInput) =>
      api.get<Page<PurchaseReturn>>(
        `v1/purchase-returns${query({ page, size, fromDate: filters?.fromDate, toDate: filters?.toDate, status: filters?.status })}`,
      ),
    detail: (id: number) =>
      api.get<PurchaseReturn>(`v1/purchase-returns/${id}`),
    formData: (inventoryId: number) =>
      api.get<PurchaseReturnFormData>(
        `v1/inventory/${inventoryId}/return/form-data`,
      ),
    create: (
      inventoryId: number,
      value: {
        returnDate: string;
        reason: string;
        notes?: string;
        refundAmount?: number;
      },
    ) => api.post<{ id: number }>(`v1/inventory/${inventoryId}/return`, value),
    receipt: (id: number, value: PaymentInput) =>
      api.post<void>(`v1/purchase-returns/${id}/receipts`, cleanPayment(value)),
    updateReceipt: (
      id: number,
      receiptId: number,
      value: PaymentInput & { version: number },
    ) =>
      api.put<void>(
        `v1/purchase-returns/${id}/receipts/${receiptId}`,
        cleanPayment(value),
      ),
    receivables: () => api.get<Outstandings>("v1/purchase-returns/receivables"),
  },
  sales: {
    list: (page = 0, size = 20, filters?: SearchInput) =>
      filters &&
      Object.values(filters).some(
        (value) => value !== undefined && value !== "",
      )
        ? api.post<Page<Sale>>(
            `v1/sales/find?page=${page}&size=${size}`,
            filters,
          )
        : api.get<Page<Sale>>(`v1/sales?page=${page}&size=${size}`),
    detail: (id: number) => api.get<Sale>(`v1/sales/${id}`),
    create: (value: SaleInput) =>
      api.post<Sale | { id: number }>("v1/sales", value),
    update: (id: number, value: SaleInput & { version: number }) =>
      api.put<Page<Sale>>(`v1/sales/${id}`, value),
    delete: (id: number) => api.delete<void>(`v1/sales/${id}`),
    payment: (id: number, value: PaymentInput & { payerType: PayerType }) =>
      api.post<void>(`v1/sales/${id}/payments`, cleanPayment(value)),
    updatePayment: (
      id: number,
      paymentId: number,
      value: PaymentInput & { version: number; payerType: PayerType },
    ) =>
      api.put<void>(
        `v1/sales/${id}/payments/${paymentId}`,
        cleanPayment(value),
      ),
    receivables: () => api.get<Outstandings>("v1/sales/receivables"),
  },
  saleReturns: {
    list: (page = 0, size = 20, filters?: SearchInput) =>
      api.get<Page<SaleReturn>>(
        `v1/sale-returns${query({ page, size, fromDate: filters?.fromDate, toDate: filters?.toDate, status: filters?.status })}`,
      ),
    detail: (id: number) => api.get<SaleReturn>(`v1/sale-returns/${id}`),
    formData: (saleId: number) =>
      api.get<SaleReturnFormData>(`v1/sales/${saleId}/return/form-data`),
    create: (
      saleId: number,
      value: {
        returnDate: string;
        reason?: string;
        notes?: string;
        exchangeHandling: ExchangeHandling;
        exchangeBuybackAmount?: number | null;
        soldVehicleDeductions: Deduction[];
        exchangeVehicleDeductions: Deduction[];
      },
    ) =>
      api.post<{ id: number; saleReturnId?: number }>(
        `v1/sales/${saleId}/return`,
        value,
      ),
    refund: (id: number, value: PaymentInput) =>
      api.post<void>(`v1/sale-returns/${id}/refunds`, cleanPayment(value)),
    updateRefund: (
      id: number,
      refundId: number,
      value: PaymentInput & { version: number },
    ) =>
      api.put<void>(
        `v1/sale-returns/${id}/refunds/${refundId}`,
        cleanPayment(value),
      ),
    deleteRefund: (id: number, refundId: number) =>
      api.delete<void>(`v1/sale-returns/${id}/refunds/${refundId}`),
    payables: () => api.get<Outstandings>("v1/sale-returns/payables"),
  },
  stock: {
    list: (page = 0, size = 20, status?: string, filters?: SearchInput) =>
      filters &&
      Object.values(filters).some(
        (value) => value !== undefined && value !== "",
      )
        ? api.post<Page<Stock>>(`v1/stock/find?page=${page}&size=${size}`, {
            ...filters,
            status: status ?? filters.status,
          })
        : api.get<Page<Stock>>(`v1/stock${query({ page, size, status })}`),
    detail: (id: number) => api.get<Stock>(`v1/stock/${id}`),
    products: () =>
      api
        .get<{
          values: Array<{ id: number; code: string; description: string }>;
        }>("v1/stock/products")
        .then((result) => result.values),
  },
  expenses: {
    list: (type: "O" | "P", page = 0, size = 20, filters?: SearchInput) =>
      filters &&
      Object.values(filters).some(
        (value) => value !== undefined && value !== "",
      )
        ? api.post<Page<Expense> & Page<PurchaseExpenseSummary>>(
            `v1/expense/find?type=${type}&page=${page}&size=${size}`,
            filters,
          )
        : api.get<Page<Expense> & Page<PurchaseExpenseSummary>>(
            `v1/expense?type=${type}&page=${page}&size=${size}`,
          ),
    detail: (id: number) => api.get<Expense>(`v1/expense/${id}`),
    byPurchase: (id: number) => api.get<Expense[]>(`v1/expense/purchase/${id}`),
    create: (value: ExpenseInput) =>
      api.post<Page<Expense>>("v1/expense", value),
    update: (id: number, value: ExpenseInput & { version: number }) =>
      api.put<Page<Expense>>(`v1/expense/${id}`, value),
    delete: (id: number) => api.delete<void>(`v1/expense/${id}`),
  },
};
