import { API_URL, ApiError, api } from "../lib/api";
import { store } from "../store/auth";

export type Direction = "IN" | "OUT";
export type PaymentAccountType = "CASH" | "BANK" | "CHEQUE";
export type CoaAccountType =
  "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export interface PaymentAccount {
  id: number;
  version: number;
  name: string;
  bankName: string | null;
  accountNo: string | null;
  ifscCode: string | null;
  accountType: PaymentAccountType;
  openingBalance: number;
  openingDate?: string | null;
  currentBalance: number | null;
  active: boolean;
}

export interface PaymentAccountInput {
  name: string;
  accountType: PaymentAccountType;
  openingBalance: number;
  openingDate?: string;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  version?: number;
}

export interface PaymentTransaction {
  id: number;
  transactionDate: string;
  type: string;
  referenceType: string;
  referenceId: number;
  paymentAccountId: number;
  paymentAccountName: string;
  amount: number;
  direction: Direction;
  description: string;
  notes: string | null;
  reversalOfId: number | null;
  reconciled?: boolean;
  reconciledAt?: string | null;
  createdAt: string;
  reversed: boolean;
}

export interface PageResult<T> {
  totalPages: number;
  totalElements: number | null;
  items: T[];
}

export interface Account {
  id: number;
  version: number;
  type: CoaAccountType;
  name: string;
  code: string;
  label: string;
  description: string;
  controlEnabled: boolean;
  directPostable?: boolean;
}

export interface DirectEntry {
  id: number;
  version: number;
  entryDate: string;
  coaId: number;
  coaLabel: string;
  coaCode?: string;
  coaName?: string;
  direction: Direction;
  amount: number;
  paymentAccountId: number;
  paymentAccountName: string;
  partyName: string;
  referenceNo: string | null;
  description: string;
  notes?: string | null;
  createdAt: string;
}

export interface DirectEntryInput {
  entryDate: string;
  coaId: number;
  direction: Direction;
  amount: number;
  paymentAccountId: number;
  partyName: string;
  referenceNo?: string;
  description: string;
  version?: number;
}

export type OtherIncome = DirectEntry;

export interface OtherIncomeInput {
  entryDate?: string;
  coaId: number;
  direction: Direction;
  amount: number;
  paymentAccountId: number;
  partyName?: string;
  description?: string;
  notes?: string;
  version?: number;
}

export interface JournalSummary {
  id: number;
  journalDate: string;
  referenceType: string;
  referenceId: number | null;
  description: string;
  status: string;
  reversalOfId: number | null;
  totalAmount: number;
  lineCount: number;
  createdAt: string;
}

export interface JournalLine {
  id: number;
  accountId: number;
  accountCode: string;
  accountName?: string;
  accountLabel: string;
  accountType: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
}

export interface JournalDetail extends JournalSummary {
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
}

export interface JournalInput {
  journalDate: string;
  description: string;
  lines: Array<{
    accountId: number;
    debitAmount?: number;
    creditAmount?: number;
    description?: string;
  }>;
}

export interface GeneralLedger {
  account: {
    accountId: number;
    code: string;
    label: string;
    type: string;
    balance: number;
  };
  fromDate: string;
  toDate: string;
  openingBalance: number;
  openingBalanceSide: string;
  closingBalance: number;
  closingBalanceSide: string;
  totalDebit: number;
  totalCredit: number;
  lines: Array<{
    journalId: number;
    journalDate: string;
    referenceType: string;
    referenceId: number;
    description: string;
    debit: number;
    credit: number;
    runningBalance: number;
    runningBalanceSide: string;
  }>;
}

export interface TrialBalance {
  asOfDate: string;
  lines: Array<{
    accountId: number;
    code: string;
    name: string;
    label: string;
    type: string;
    totalDebit: number;
    totalCredit: number;
    netBalance: number;
    balanceSide: string;
  }>;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface ReportAccountLine {
  accountId: number;
  code: string;
  label: string;
  type: string;
  balance: number;
}

export interface BalanceSheet {
  asOfDate: string;
  assets: { accounts: ReportAccountLine[]; total: number };
  liabilities: { accounts: ReportAccountLine[]; total: number };
  equity: {
    accounts: ReportAccountLine[];
    total: number;
    currentYearEarnings?: number;
  };
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

export interface JournalProfitLoss {
  fromDate: string;
  toDate: string;
  revenue: { accounts: ReportAccountLine[]; total: number };
  expenses: { accounts: ReportAccountLine[]; total: number };
  netProfit: number;
}

export interface ProfitLoss {
  month: string;
  period: string;
  totalRevenue: number;
  grossProfit: number;
  grossMarginPct: number;
  returnDeductionIncome: number;
  exchangeGain: number;
  exchangeReturnLoss: number;
  purchaseReturnLoss: number;
  totalOperatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
  salesTotals: {
    count: number;
    returnCount: number;
    saleRate: number;
    cost: number;
    purchaseExpenses: number;
    profit: number;
  };
  purchaseTotals: {
    count: number;
    returnCount: number;
    purchaseRate: number;
    purchaseExpenses: number;
    landedCost: number;
    returnAmount: number;
  };
  expenseTotals: { count: number; amount: number };
  directEntryTotals: {
    inCount: number;
    inAmount: number;
    outCount: number;
    outAmount: number;
    incomeCount: number;
    incomeAmount: number;
    expenseCount: number;
    expenseAmount: number;
    otherCount: number;
    otherAmount: number;
  };
  totalReceivables: number;
  totalReceivablesTillDate: number;
  totalPayables: number;
  totalPayablesTillDate: number;
  cashPosition: Array<{
    id: number;
    name: string;
    accountType: string;
    balance: number;
  }>;
  totalCashPosition: number;
  sales: Array<{
    saleId: number;
    invoiceNo: string;
    saleDate: string;
    vehicleNo: string;
    customerName: string;
    purchaseRate: number;
    purchaseExpenses: number;
    saleRate: number;
    profit: number;
    returned: boolean;
    pendingAmount: number;
  }>;
  purchases: Array<{
    purchaseId: number;
    referenceNo: string;
    purchaseDate: string;
    vehicleNo: string;
    vendorName: string;
    purchaseRate: number;
    purchaseExpenses: number;
    landedCost: number;
    returned: boolean;
    returnAmount: number | null;
    pendingAmount: number;
  }>;
  expenses: Array<{
    date: string;
    expenseName: string;
    amount: number;
    accountName: string;
  }>;
  directEntries: Array<{
    date: string;
    name: string;
    amount: number;
    category: string;
    accountName: string;
    direction: string;
    classification: string;
  }>;
}

export interface TrendReport {
  trend: Array<{
    month: string;
    monthLabel: string;
    salesCount: number;
    totalRevenue: number;
    grossProfit: number;
    grossMarginPct: number;
    totalReceivables: number;
    totalPayables: number;
    totalExpenses: number;
  }>;
}

export interface MonthlyOverview {
  data: Array<{
    month: string;
    totalSales: number;
    totalPurchase: number;
    totalExpenses: number;
    totalProfit: number;
  }>;
}

const query = (
  values: Record<string, string | number | boolean | undefined>,
) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
};

const clean = (value?: string) => value?.trim() || undefined;

const download = async (
  endpoint: string,
  fallbackName: string,
): Promise<void> => {
  const token = store.getState().auth.session?.token;
  const response = await fetch(`${API_URL}/${endpoint.replace(/^\//, "")}`, {
    headers: {
      Accept: "text/csv",
      "X-Client-Type": "WEB",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok)
    throw new ApiError("Unable to download the report.", response.status);
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const matched = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(disposition);
  const name = matched?.[1] ? decodeURIComponent(matched[1]) : fallbackName;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const accountingApi = {
  async paymentAccounts(balance = true): Promise<PaymentAccount[]> {
    const data = await api.get<{ accounts: PaymentAccount[] }>(
      balance ? "v1/payment-accounts/balance" : "v1/payment-accounts",
    );
    return data.accounts ?? [];
  },
  paymentAccount: (id: number) =>
    api.get<PaymentAccount>(`v1/payment-accounts/${id}`),
  createPaymentAccount: (input: PaymentAccountInput) =>
    api.post<{ id: number }>("v1/payment-accounts", {
      ...input,
      name: input.name.trim(),
      openingDate: clean(input.openingDate),
      bankName: clean(input.bankName),
      accountNo: clean(input.accountNo),
      ifscCode: clean(input.ifscCode),
    }),
  updatePaymentAccount: (id: number, input: PaymentAccountInput) =>
    api.put<PaymentAccount>(`v1/payment-accounts/${id}`, {
      ...input,
      name: input.name.trim(),
      openingDate: clean(input.openingDate),
      bankName: clean(input.bankName),
      accountNo: clean(input.accountNo),
      ifscCode: clean(input.ifscCode),
    }),
  async transactions(
    id: number,
    page: number,
    size: number,
    unreconciled: boolean,
  ): Promise<PageResult<PaymentTransaction>> {
    const data = await api.get<{
      transactions: PaymentTransaction[] | null;
      totalPages: number;
      totalElements: number | null;
    }>(
      `v1/payment-accounts/${id}/${unreconciled ? "unreconciled" : "transactions"}${query({ page, size })}`,
    );
    return { ...data, items: data.transactions ?? [] };
  },
  reconcile: (id: number, transactionIds: number[]) =>
    api.post<{
      totalRequested: number;
      reconciled: number;
      alreadyReconciled: number;
      skipped: number;
    }>(`v1/payment-accounts/${id}/reconcile`, { transactionIds }),

  async accounts(directPostable?: boolean, type?: string): Promise<Account[]> {
    const data = await api.get<{ accounts: Account[] }>(
      `v1/account${query({ directPostable, type })}`,
    );
    return data.accounts ?? [];
  },
  account: (id: number) => api.get<Account>(`v1/account/${id}`),
  async createAccount(input: {
    type: CoaAccountType;
    label: string;
    description: string;
    directPostable?: boolean;
  }): Promise<Account> {
    const data = await api.post<{ account: Account }>("v1/account", {
      ...input,
      label: input.label.trim(),
      description: input.description.trim(),
      directPostable: input.directPostable ?? true,
    });
    return data.account;
  },

  async directEntries(filters: {
    page: number;
    size: number;
    searchText?: string;
    fromDate?: string;
    toDate?: string;
    month?: string;
  }): Promise<PageResult<DirectEntry>> {
    const { page, size, ...body } = filters;
    let data: {
      entries: DirectEntry[] | null;
      totalPages: number;
      totalElements: number | null;
    };
    try {
      data = await api.post(
        `v1/direct-entries/find${query({ page, size })}`,
        body,
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      data = await api.get(
        `v1/direct-entries${query({ page, size, ...body })}`,
      );
    }
    return { ...data, items: data.entries ?? [] };
  },
  directEntry: (id: number) => api.get<DirectEntry>(`v1/direct-entries/${id}`),
  createDirectEntry: (input: DirectEntryInput) =>
    api.post<void>("v1/direct-entries", {
      ...input,
      partyName: input.partyName.trim(),
      description: input.description.trim(),
      referenceNo: clean(input.referenceNo),
    }),
  updateDirectEntry: (id: number, input: DirectEntryInput) =>
    api.put<void>(`v1/direct-entries/${id}`, {
      entryDate: input.entryDate,
      coaId: input.coaId,
      direction: input.direction,
      amount: input.amount,
      paymentAccountId: input.paymentAccountId,
      partyName: input.partyName.trim(),
      description: input.description.trim(),
      version: input.version,
    }),
  deleteDirectEntry: (id: number) =>
    api.delete<void>(`v1/direct-entries/${id}`),

  async otherIncomes(filters: {
    page: number;
    size: number;
    searchText?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PageResult<OtherIncome>> {
    const data = await api.get<{
      entries: OtherIncome[] | null;
      totalPages: number;
      totalElements: number | null;
    }>(`v1/other-incomes${query(filters)}`);
    return { ...data, items: data.entries ?? [] };
  },
  otherIncome: (id: number) =>
    api.get<OtherIncome>(`v1/other-incomes/${id}`),
  createOtherIncome: (input: OtherIncomeInput) =>
    api.post<void>("v1/other-incomes", {
      ...input,
      partyName: clean(input.partyName),
      description: clean(input.description),
      notes: clean(input.notes),
      entryDate: clean(input.entryDate),
    }),
  updateOtherIncome: (id: number, input: OtherIncomeInput) =>
    api.put<void>(`v1/other-incomes/${id}`, {
      entryDate: clean(input.entryDate),
      coaId: input.coaId,
      direction: input.direction,
      amount: input.amount,
      paymentAccountId: input.paymentAccountId,
      partyName: clean(input.partyName),
      description: clean(input.description),
      notes: clean(input.notes),
      version: input.version,
    }),
  deleteOtherIncome: (id: number) =>
    api.delete<void>(`v1/other-incomes/${id}`),

  async journals(filters: {
    page: number;
    size: number;
    referenceType?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PageResult<JournalSummary>> {
    const data = await api.get<{
      journals: JournalSummary[];
      totalPages: number;
      totalElements: number;
    }>(`v1/journals${query(filters)}`);
    return { ...data, items: data.journals ?? [] };
  },
  journal: (id: number) => api.get<JournalDetail>(`v1/journals/${id}`),
  createJournal: (input: JournalInput) =>
    api.post<{ id: number }>("v1/journals", input),
  ledger: (accountId: number, fromDate?: string, toDate?: string) =>
    api.get<GeneralLedger>(
      `v1/journals/ledger/${accountId}${query({ fromDate, toDate })}`,
    ),
  trialBalance: (asOfDate?: string, includeZeroBalance = false) =>
    api.get<TrialBalance>(
      `v1/reports/trial-balance${query({ asOfDate, includeZeroBalance: includeZeroBalance || undefined })}`,
    ),
  balanceSheet: (asOfDate?: string) =>
    api.get<BalanceSheet>(`v1/reports/balance-sheet${query({ asOfDate })}`),
  journalProfitLoss: (fromDate?: string, toDate?: string) =>
    api.get<JournalProfitLoss>(
      `v1/reports/pl-from-journal${query({ fromDate, toDate })}`,
    ),
  profitLoss: (month?: string) =>
    api.get<ProfitLoss>(`v1/reports/pl${query({ month })}`),
  trend: (months = 6) =>
    api.get<TrendReport>(`v1/reports/trend${query({ months })}`),
  monthlyOverview: (months = 6) =>
    api.get<MonthlyOverview>(`v1/home/overview${query({ months })}`),

  downloadProfitLoss: (month: string) =>
    download(
      `v1/reports/pl/csv${query({ month })}`,
      `profit-loss-${month}.csv`,
    ),
  downloadLedger: (id: number, fromDate: string, toDate: string) =>
    download(
      `v1/journals/ledger/${id}/csv${query({ fromDate, toDate })}`,
      `general-ledger-${fromDate}-${toDate}.csv`,
    ),
  downloadTrialBalance: (asOfDate: string, includeZeroBalance: boolean) =>
    download(
      `v1/reports/trial-balance/csv${query({ asOfDate, includeZeroBalance: includeZeroBalance || undefined })}`,
      `trial-balance-${asOfDate}.csv`,
    ),
  downloadJournalProfitLoss: (fromDate: string, toDate: string) =>
    download(
      `v1/reports/pl-from-journal/csv${query({ fromDate, toDate })}`,
      `journal-profit-loss-${fromDate}-${toDate}.csv`,
    ),
  downloadBalanceSheet: (asOfDate: string) =>
    download(
      `v1/reports/balance-sheet/csv${query({ asOfDate })}`,
      `balance-sheet-${asOfDate}.csv`,
    ),
};
