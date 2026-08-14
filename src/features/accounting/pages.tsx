import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CircleDollarSign,
  Download,
  Landmark,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DateInput,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  SearchFilters,
  Select,
  StatCard,
  Textarea,
  type DataColumn,
} from "../../components/ui";
import { Can } from "../../components/Can";
import { AuditHistoryButton } from "../audit/AuditHistory";
import { ApiError } from "../../lib/api";
import {
  extractFieldErrors,
  getFieldValidationMessage,
  getServerFieldValidationMessage,
  normalizeFieldPath,
  tryApplyManualFieldValidationErrors,
} from "../../lib/validation";
import { formatDate } from "../../lib/utils";
import type {
  ValidationCode,
  ValidationModule,
} from "../../lib/validation-messages";
import {
  accountingApi,
  type BalanceSheet,
  type CoaAccountType,
  type DirectEntry,
  type DirectEntryInput,
  type Direction,
  type JournalInput,
  type JournalProfitLoss,
  type JournalSummary,
  type OtherIncome,
  type OtherIncomeInput,
  type PaymentAccount,
  type PaymentAccountInput,
  type PaymentAccountType,
  type PaymentTransaction,
  type ProfitLoss,
  type ReportAccountLine,
} from "../../services/accounting";
import "./accounting.css";

const today = () => {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};
const thisMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
const humanize = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
const message = (error: unknown) =>
  error instanceof ApiError ? error.message : "Something went wrong.";
const positive = (value: number) => (value >= 0 ? "amount-in" : "amount-out");

const parseId = (value: string | undefined): number | null => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const applyServerFieldErrors = (
  error: unknown,
  setErrors: (errors: Record<string, string>) => void,
  moduleName: ValidationModule,
  fieldMap?: Record<string, string>,
) =>
  tryApplyManualFieldValidationErrors(error, setErrors, moduleName, fieldMap);

const validationMessage = (
  moduleName: ValidationModule,
  field: string,
  code: ValidationCode,
) => getFieldValidationMessage(moduleName, field, code);

const required = (value: string) => value.trim().length > 0;

const QueryError = ({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) => <ErrorState message={message(error)} onRetry={retry} />;

const DownloadButton = ({
  run,
  disabled,
}: {
  run: () => Promise<void>;
  disabled?: boolean;
}) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={disabled}
      loading={loading}
      onClick={() => {
        setLoading(true);
        void run()
          .catch((error: unknown) => toast.error(message(error)))
          .finally(() => setLoading(false));
      }}
    >
      <Download size={16} /> CSV
    </Button>
  );
};

const AccountOptions = ({
  value,
  onChange,
  all = false,
  type,
  ...accessibility
}: {
  value: string;
  onChange: (value: string) => void;
  all?: boolean;
  type?: CoaAccountType;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) => {
  const query = useQuery({
    queryKey: ["accounting", "coa", all, type ?? "all"],
    queryFn: () => accountingApi.accounts(all ? false : true, type),
  });
  return (
    <Select
      {...accessibility}
      value={value}
      disabled={query.isLoading}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Select account"
      options={(query.data ?? [])
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((account) => ({
          value: String(account.id),
          label: `${account.code} — ${account.label}`,
        }))}
    />
  );
};

const PaymentOptions = ({
  value,
  onChange,
  ...accessibility
}: {
  value: string;
  onChange: (value: string) => void;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) => {
  const query = useQuery({
    queryKey: ["accounting", "payment-accounts"],
    queryFn: () => accountingApi.paymentAccounts(),
  });
  return (
    <Select
      {...accessibility}
      value={value}
      disabled={query.isLoading}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Select payment account"
      options={(query.data ?? [])
        .filter((account) => account.active)
        .map((account) => ({
          value: String(account.id),
          label: `${account.name} (${money(account.currentBalance)})`,
        }))}
    />
  );
};

export const PaymentAccountsPage = () => {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["accounting", "payment-accounts"],
    queryFn: () => accountingApi.paymentAccounts(),
  });
  const total = (query.data ?? []).reduce(
    (sum, account) => sum + (account.currentBalance ?? account.openingBalance),
    0,
  );
  const columns: DataColumn<PaymentAccount>[] = [
    {
      key: "name",
      header: "Account",
      cell: (account) => (
        <span>
          <strong>{account.name}</strong>
          <small className="cell-subtitle">{account.bankName}</small>
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (account) => <Badge>{account.accountType}</Badge>,
    },
    {
      key: "opening",
      header: "Opening",
      align: "right",
      cell: (account) => money(account.openingBalance),
    },
    {
      key: "balance",
      header: "Current balance",
      align: "right",
      cell: (account) => (
        <strong>
          {money(account.currentBalance ?? account.openingBalance)}
        </strong>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Payment Accounts"
        description="Cash and bank balances."
        actions={
          <Can resource="PAYMENT_ACCOUNT" privilege="CREATE">
            <Link
              className="button button--primary"
              to="/accounting/accounts/new"
            >
              <Plus size={16} /> New account
            </Link>
          </Can>
        }
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="accounting-stats">
            <StatCard label="Total available balance" value={money(total)} />
            <StatCard label="Active accounts" value={query.data?.length ?? 0} />
          </div>
          <Card>
            <DataTable
              caption="Payment accounts"
              columns={columns}
              rows={query.data ?? []}
              rowKey={(account) => String(account.id)}
              onRowClick={(account) =>
                navigate(`/accounting/accounts/${account.id}/transactions`)
              }
            />
          </Card>
        </>
      )}
    </>
  );
};

type PaymentAccountFormState = Omit<PaymentAccountInput, "openingBalance"> & {
  openingBalance: number | "";
};

const paymentInitial: PaymentAccountFormState = {
  name: "",
  accountType: "CASH",
  openingBalance: 0,
};

export const PaymentAccountFormPage = () => {
  const { accountId } = useParams();
  const id = parseId(accountId);
  const isEdit = accountId !== undefined;
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form, setForm] = useState<PaymentAccountFormState>(paymentInitial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const detail = useQuery({
    queryKey: ["accounting", "payment-account", id],
    queryFn: () => accountingApi.paymentAccount(id as number),
    enabled: id !== null,
  });
  useEffect(() => {
    if (detail.data) {
      setForm({
        name: detail.data.name,
        accountType: detail.data.accountType,
        openingBalance: detail.data.openingBalance,
        openingDate: detail.data.openingDate ?? "",
        bankName: detail.data.bankName ?? "",
        accountNo: detail.data.accountNo ?? "",
        ifscCode: detail.data.ifscCode ?? "",
        version: detail.data.version,
      });
    }
  }, [detail.data]);
  const payload = (): PaymentAccountInput => ({
    ...form,
    openingBalance: Number(form.openingBalance),
    bankName: form.accountType === "BANK" ? form.bankName : undefined,
    accountNo: form.accountType === "BANK" ? form.accountNo : undefined,
    ifscCode: form.accountType === "BANK" ? form.ifscCode : undefined,
  });
  const mutation = useMutation({
    mutationFn: () =>
      id
        ? accountingApi.updatePaymentAccount(id, payload())
        : accountingApi.createPaymentAccount(payload()),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["accounting"] });
      toast.success(`Payment account ${id ? "updated" : "created"}.`);
      navigate("/accounting/accounts");
    },
    onError: (error) => {
      const hasFieldErrors = applyServerFieldErrors(
        error,
        setErrors,
        "paymentAccount",
        {
          accountNumber: "accountNo",
          ifsc: "ifscCode",
        },
      );
      if (error instanceof ApiError && error.status === 409) {
        toast.error(
          "This account changed on the server. Reload and try again.",
        );
        void detail.refetch();
      } else if (!hasFieldErrors) {
        toast.error(message(error));
      }
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!required(form.name))
      next.name = validationMessage("paymentAccount", "name", "REQUIRED");
    if (form.openingBalance === "" || !Number.isFinite(form.openingBalance))
      next.openingBalance = validationMessage(
        "paymentAccount",
        "openingBalance",
        "REQUIRED",
      );
    else if (form.openingBalance < 0)
      next.openingBalance = validationMessage(
        "paymentAccount",
        "openingBalance",
        "NON_NEGATIVE",
      );
    if (form.openingDate && form.openingDate > today())
      next.openingDate = validationMessage(
        "paymentAccount",
        "openingDate",
        "FUTURE_DATE",
      );
    if (form.accountType === "BANK") {
      if (!required(form.bankName ?? ""))
        next.bankName = validationMessage(
          "paymentAccount",
          "bankName",
          "REQUIRED",
        );
      if (!required(form.accountNo ?? ""))
        next.accountNo = validationMessage(
          "paymentAccount",
          "accountNumber",
          "REQUIRED",
        );
      if (!required(form.ifscCode ?? ""))
        next.ifscCode = validationMessage("paymentAccount", "ifsc", "REQUIRED");
    }
    setErrors(next);
    if (!Object.keys(next).length) mutation.mutate();
  };
  if (isEdit && id === null)
    return <ErrorState message="Invalid payment account." />;
  if (id && detail.isLoading) return <LoadingState />;
  if (id && detail.isError)
    return (
      <QueryError error={detail.error} retry={() => void detail.refetch()} />
    );
  return (
    <>
      <PageHeader
        title={id ? "Edit Payment Account" : "New Payment Account"}
        description="Configure a cash or bank account."
      />
      <Card>
        <form className="accounting-form" noValidate onSubmit={submit}>
          <FormField label="Account name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </FormField>
          <fieldset className="account-type-options">
            <legend>
              Account type <span aria-hidden="true">*</span>
            </legend>
            {(["CASH", "BANK"] as PaymentAccountType[]).map((type) => (
              <label
                key={type}
                className={
                  form.accountType === type ? "is-selected" : undefined
                }
              >
                <input
                  type="radio"
                  name="accountType"
                  value={type}
                  checked={form.accountType === type}
                  onChange={() =>
                    setForm({
                      ...form,
                      accountType: type,
                      ...(type === "CASH"
                        ? {
                            bankName: undefined,
                            accountNo: undefined,
                            ifscCode: undefined,
                          }
                        : {}),
                    })
                  }
                />
                {humanize(type)}
              </label>
            ))}
            <label className="is-disabled">
              <input type="radio" disabled />
              Cheque (Coming soon)
            </label>
            {errors.accountType && (
              <small className="form-error" role="alert">
                {errors.accountType}
              </small>
            )}
          </fieldset>
          <FormField
            label="Opening balance"
            required
            error={errors.openingBalance}
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.openingBalance}
              onChange={(event) =>
                setForm({
                  ...form,
                  openingBalance:
                    event.target.value === "" ? "" : Number(event.target.value),
                })
              }
            />
          </FormField>
          <FormField label="Opening date" error={errors.openingDate}>
            <DateInput
              max={today()}
              value={form.openingDate ?? ""}
              onChange={(event) =>
                setForm({ ...form, openingDate: event.target.value })
              }
            />
          </FormField>
          {id && detail.data && (
            <>
              <FormField label="Current balance">
                <Input value={money(detail.data.currentBalance)} readOnly />
              </FormField>
              <FormField label="Status">
                <Input
                  value={detail.data.active ? "Active" : "Inactive"}
                  readOnly
                />
              </FormField>
            </>
          )}
          {form.accountType === "BANK" && (
            <>
              <FormField label="Bank name" required error={errors.bankName}>
                <Input
                  value={form.bankName ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, bankName: event.target.value })
                  }
                />
              </FormField>
              <FormField
                label="Account number"
                required
                error={errors.accountNo}
              >
                <Input
                  value={form.accountNo ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, accountNo: event.target.value })
                  }
                />
              </FormField>
              <FormField label="IFSC code" required error={errors.ifscCode}>
                <Input
                  value={form.ifscCode ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      ifscCode: event.target.value.toUpperCase(),
                    })
                  }
                />
              </FormField>
            </>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Save account
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
};

const AdjustmentModal = ({
  account,
  open,
  close,
}: {
  account: PaymentAccount;
  open: boolean;
  close: () => void;
}) => {
  const client = useQueryClient();
  const [form, setForm] = useState<DirectEntryInput>({
    entryDate: today(),
    coaId: 0,
    direction: "OUT",
    amount: 0,
    paymentAccountId: account.id,
    partyName: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: () => accountingApi.createDirectEntry(form),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["accounting"] });
      toast.success("Adjustment created.");
      close();
    },
    onError: (error) => {
      if (
        !applyServerFieldErrors(error, setErrors, "directAdjustment", {
          accountId: "coaId",
          date: "entryDate",
          party: "partyName",
        })
      )
        toast.error(message(error));
    },
  });
  const save = () => {
    const next: Record<string, string> = {};
    if (!form.coaId)
      next.coaId = validationMessage(
        "directAdjustment",
        "accountId",
        "REQUIRED",
      );
    if (!required(form.entryDate))
      next.entryDate = validationMessage(
        "directAdjustment",
        "date",
        "REQUIRED",
      );
    else if (form.entryDate > today())
      next.entryDate = validationMessage(
        "directAdjustment",
        "date",
        "FUTURE_DATE",
      );
    if (!Number.isFinite(form.amount) || form.amount <= 0)
      next.amount = validationMessage(
        "directAdjustment",
        "amount",
        "MUST_BE_POSITIVE",
      );
    else if (
      form.direction === "OUT" &&
      form.amount > (account.currentBalance ?? account.openingBalance)
    )
      next.amount = validationMessage("directAdjustment", "amount", "MAXIMUM");
    if (!required(form.partyName))
      next.partyName = validationMessage(
        "directAdjustment",
        "party",
        "REQUIRED",
      );
    if (!required(form.description))
      next.description = validationMessage(
        "directAdjustment",
        "description",
        "REQUIRED",
      );
    setErrors(next);
    if (!Object.keys(next).length) mutation.mutate();
  };
  return (
    <Modal
      open={open}
      title="Add direct adjustment"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={save}>
            Save adjustment
          </Button>
        </>
      }
    >
      <div className="accounting-form">
        <FormField label="Payment account" error={errors.paymentAccountId}>
          <Input value={account.name} disabled />
        </FormField>
        <FormField label="Direction" required error={errors.direction}>
          <Select
            value={form.direction}
            onChange={(event) =>
              setForm({ ...form, direction: event.target.value as Direction })
            }
            options={[
              { value: "IN", label: "Credit — money in" },
              { value: "OUT", label: "Debit — money out" },
            ]}
          />
        </FormField>
        <FormField label="Chart account" required error={errors.coaId}>
          <AccountOptions
            value={String(form.coaId || "")}
            onChange={(value) => setForm({ ...form, coaId: Number(value) })}
          />
        </FormField>
        <FormField label="Date" required error={errors.entryDate}>
          <DateInput
            max={today()}
            value={form.entryDate}
            onChange={(event) =>
              setForm({ ...form, entryDate: event.target.value })
            }
          />
        </FormField>
        <FormField
          label="Amount"
          required
          error={
            errors.amount ??
            (form.direction === "OUT" &&
            form.amount > (account.currentBalance ?? account.openingBalance)
              ? validationMessage("directAdjustment", "amount", "MAXIMUM")
              : undefined)
          }
        >
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount || ""}
            onChange={(event) =>
              setForm({ ...form, amount: Number(event.target.value) })
            }
          />
        </FormField>
        <FormField label="Party" required error={errors.partyName}>
          <Input
            value={form.partyName}
            onChange={(event) =>
              setForm({ ...form, partyName: event.target.value })
            }
          />
        </FormField>
        <FormField label="Description" required error={errors.description}>
          <Input
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </FormField>
        <FormField label="Reference" error={errors.referenceNo}>
          <Input
            value={form.referenceNo ?? ""}
            onChange={(event) =>
              setForm({ ...form, referenceNo: event.target.value })
            }
          />
        </FormField>
      </div>
    </Modal>
  );
};

export const PaymentAccountTransactionsPage = () => {
  const id = parseId(useParams().accountId);
  const [page, setPage] = useState(1);
  const [unreconciled, setUnreconciled] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adjusting, setAdjusting] = useState(false);
  const client = useQueryClient();
  const account = useQuery({
    queryKey: ["accounting", "payment-account", id],
    queryFn: () => accountingApi.paymentAccount(id as number),
    enabled: id !== null,
  });
  const transactions = useQuery({
    queryKey: ["accounting", "transactions", id, page, unreconciled],
    queryFn: () =>
      accountingApi.transactions(id as number, page - 1, 20, unreconciled),
    enabled: id !== null,
  });
  const reconcile = useMutation({
    mutationFn: () =>
      accountingApi.reconcile(id as number, Array.from(selected)),
    onSuccess: async (result) => {
      toast.success(
        `${result.reconciled} reconciled${result.alreadyReconciled ? `, ${result.alreadyReconciled} already reconciled` : ""}${result.skipped ? `, ${result.skipped} skipped` : ""}.`,
      );
      setSelected(new Set());
      await client.invalidateQueries({
        queryKey: ["accounting", "transactions", id],
      });
    },
    onError: (error) => toast.error(message(error)),
  });
  if (!id) return <ErrorState message="Invalid payment account." />;
  if (account.isLoading || transactions.isLoading) return <LoadingState />;
  if (account.isError)
    return (
      <QueryError error={account.error} retry={() => void account.refetch()} />
    );
  if (transactions.isError)
    return (
      <QueryError
        error={transactions.error}
        retry={() => void transactions.refetch()}
      />
    );
  const columns: DataColumn<PaymentTransaction>[] = [
    ...(unreconciled
      ? [
          {
            key: "select",
            header: "Select",
            cell: (item: PaymentTransaction) => (
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
              />
            ),
          } satisfies DataColumn<PaymentTransaction>,
        ]
      : []),
    { key: "date", header: "Date", cell: (item) => item.transactionDate },
    {
      key: "type",
      header: "Type",
      cell: (item) => (
        <>
          <Badge tone={item.reversed ? "danger" : "info"}>
            {humanize(item.type)}
          </Badge>
          <small className="cell-subtitle">
            {humanize(item.referenceType)} #{item.referenceId}
          </small>
        </>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (item) => (
        <>
          {item.description}
          <small className="cell-subtitle">{item.notes}</small>
        </>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (item) => (
        <strong
          className={item.direction === "IN" ? "amount-in" : "amount-out"}
        >
          {item.direction === "IN" ? "+" : "−"}
          {money(item.amount)}
        </strong>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title={account.data?.name ?? "Account Transactions"}
        description={`Current balance ${money(account.data?.currentBalance)}`}
        actions={
          unreconciled ? (
            <>
              <Button variant="secondary" onClick={() => setAdjusting(true)}>
                <Plus size={16} /> Adjustment
              </Button>
              <Button
                disabled={!selected.size}
                loading={reconcile.isPending}
                onClick={() => reconcile.mutate()}
              >
                Reconcile ({selected.size})
              </Button>
            </>
          ) : undefined
        }
      />
      <div className="segmented">
        <Button
          variant={!unreconciled ? "primary" : "secondary"}
          onClick={() => {
            setUnreconciled(false);
            setPage(1);
          }}
        >
          All
        </Button>
        <Button
          variant={unreconciled ? "primary" : "secondary"}
          onClick={() => {
            setUnreconciled(true);
            setPage(1);
            setSelected(new Set());
          }}
        >
          Unreconciled
        </Button>
      </div>
      <Card>
        <DataTable
          caption="Account transactions"
          columns={columns}
          rows={transactions.data?.items ?? []}
          rowKey={(item) => String(item.id)}
        />
        <Pagination
          page={page}
          pageCount={transactions.data?.totalPages ?? 0}
          onPageChange={setPage}
        />
      </Card>
      {account.data && (
        <AdjustmentModal
          account={account.data}
          open={adjusting}
          close={() => setAdjusting(false)}
        />
      )}
    </>
  );
};

export const DirectEntriesPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("q") ?? "";
  const fromDate = params.get("from") ?? "";
  const toDate = params.get("to") ?? "";
  const query = useQuery({
    queryKey: ["accounting", "direct-entries", page, search, fromDate, toDate],
    queryFn: () =>
      accountingApi.directEntries({
        page: page - 1,
        size: 20,
        searchText: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };
  const columns: DataColumn<DirectEntry>[] = [
    { key: "date", header: "Date", cell: (entry) => entry.entryDate },
    {
      key: "account",
      header: "COA",
      cell: (entry) => entry.coaLabel || entry.coaName || "—",
    },
    {
      key: "paymentAccount",
      header: "Payment account",
      cell: (entry) => (
        <>
          <strong>{entry.paymentAccountName}</strong>
          <small className="cell-subtitle">
            Account #{entry.paymentAccountId}
          </small>
        </>
      ),
    },
    {
      key: "description",
      header: "Details",
      cell: (entry) => (
        <span>
          <strong>{entry.description}</strong>
          <small className="cell-subtitle">
            {entry.partyName}
            {entry.referenceNo ? ` · ${entry.referenceNo}` : ""}
          </small>
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (entry) => (
        <strong
          className={entry.direction === "IN" ? "amount-in" : "amount-out"}
        >
          {entry.direction === "IN" ? "+" : "−"}
          {money(entry.amount)}
        </strong>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Direct Entries"
        description="Manual money-in and money-out entries."
        actions={
          <Can resource="DIRECT_ENTRY" privilege="CREATE">
            <Link
              className="button button--primary"
              to="/accounting/direct-entry/new"
            >
              <Plus size={16} /> New entry
            </Link>
          </Can>
        }
      />
      <SearchFilters
        query={search}
        collapsible
        onQueryChange={(value) => update("q", value)}
      >
        <DateInput
          aria-label="From date"
          value={fromDate}
          onChange={(event) => update("from", event.target.value)}
        />
        <DateInput
          aria-label="To date"
          value={toDate}
          onChange={(event) => update("to", event.target.value)}
        />
      </SearchFilters>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Card>
          <DataTable
            caption="Direct entries"
            columns={columns}
            rows={query.data?.items ?? []}
            rowKey={(entry) => String(entry.id)}
            onRowClick={(entry) =>
              navigate(`/accounting/direct-entry/${entry.id}`)
            }
          />
          <Pagination
            page={page}
            pageCount={query.data?.totalPages ?? 0}
            onPageChange={(value) => update("page", String(value))}
          />
        </Card>
      )}
    </>
  );
};

const directInitial: DirectEntryInput = {
  entryDate: today(),
  coaId: 0,
  direction: "IN",
  amount: 0,
  paymentAccountId: 0,
  partyName: "",
  referenceNo: "",
  description: "",
};

export const DirectEntryFormPage = () => {
  const id = parseId(useParams().entryId);
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form, setForm] = useState<DirectEntryInput>(directInitial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const detail = useQuery({
    queryKey: ["accounting", "direct-entry", id],
    queryFn: () => accountingApi.directEntry(id as number),
    enabled: id !== null,
  });
  const paymentAccounts = useQuery({
    queryKey: ["accounting", "payment-accounts"],
    queryFn: () => accountingApi.paymentAccounts(),
  });
  useEffect(() => {
    if (detail.data) {
      setForm({
        entryDate: detail.data.entryDate,
        coaId: detail.data.coaId,
        direction: detail.data.direction,
        amount: detail.data.amount,
        paymentAccountId: detail.data.paymentAccountId,
        partyName: detail.data.partyName,
        referenceNo: detail.data.referenceNo ?? "",
        description: detail.data.description,
        version: detail.data.version,
      });
    }
  }, [detail.data]);
  const save = useMutation({
    mutationFn: () =>
      id
        ? accountingApi.updateDirectEntry(id, form)
        : accountingApi.createDirectEntry(form),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["accounting"] });
      toast.success(`Direct entry ${id ? "updated" : "created"}.`);
      navigate("/accounting/direct-entry");
    },
    onError: async (error) => {
      const hasFieldErrors = applyServerFieldErrors(
        error,
        setErrors,
        "directEntry",
        {
          accountId: "coaId",
          party: "partyName",
          date: "entryDate",
        },
      );
      if (error instanceof ApiError && error.status === 409 && id) {
        toast.error("This entry was updated elsewhere. Latest version loaded.");
        const latest = await accountingApi.directEntry(id);
        setForm((current) => ({ ...current, version: latest.version }));
      } else if (!hasFieldErrors) toast.error(message(error));
    },
  });
  const remove = useMutation({
    mutationFn: () => accountingApi.deleteDirectEntry(id as number),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["accounting"] });
      toast.success("Direct entry deleted.");
      navigate("/accounting/direct-entry");
    },
    onError: (error) => toast.error(message(error)),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.coaId)
      next.coaId = validationMessage("directEntry", "accountId", "REQUIRED");
    if (!form.paymentAccountId)
      next.paymentAccountId = validationMessage(
        "directEntry",
        "paymentAccountId",
        "REQUIRED",
      );
    if (!required(form.partyName))
      next.partyName = validationMessage("directEntry", "party", "REQUIRED");
    if (!required(form.description))
      next.description = validationMessage(
        "directEntry",
        "description",
        "REQUIRED",
      );
    if (!Number.isFinite(form.amount) || form.amount <= 0)
      next.amount = validationMessage(
        "directEntry",
        "amount",
        "MUST_BE_POSITIVE",
      );
    if (!required(form.entryDate))
      next.entryDate = validationMessage("directEntry", "date", "REQUIRED");
    else if (form.entryDate > today())
      next.entryDate = validationMessage("directEntry", "date", "FUTURE_DATE");
    const selected = paymentAccounts.data?.find(
      (account) => account.id === form.paymentAccountId,
    );
    if (
      selected &&
      form.direction === "OUT" &&
      form.amount > (selected.currentBalance ?? selected.openingBalance)
    )
      next.amount = validationMessage("directEntry", "amount", "MAXIMUM");
    setErrors(next);
    if (!Object.keys(next).length) save.mutate();
  };
  if ((id && detail.isLoading) || paymentAccounts.isLoading)
    return <LoadingState />;
  return (
    <>
      <PageHeader
        title={id ? "Direct Entry Detail" : "New Direct Entry"}
        description={
          id ? "Review or update this entry." : "Create a manual entry."
        }
        actions={
          id ? (
            <AuditHistoryButton
              entityType="direct-entry"
              entityId={id}
              recordLabel={form.description}
            />
          ) : undefined
        }
      />
      <Card>
        <form className="accounting-form" noValidate onSubmit={submit}>
          <FormField label="Direction" required error={errors.direction}>
            <Select
              value={form.direction}
              onChange={(event) =>
                setForm({
                  ...form,
                  direction: event.target.value as Direction,
                })
              }
              options={[
                { value: "IN", label: "Credit — money in" },
                { value: "OUT", label: "Debit — money out" },
              ]}
            />
          </FormField>
          <FormField label="Chart account" required error={errors.coaId}>
            <AccountOptions
              value={String(form.coaId || "")}
              onChange={(value) => setForm({ ...form, coaId: Number(value) })}
            />
          </FormField>
          <FormField label="Entry date" required error={errors.entryDate}>
            <DateInput
              max={today()}
              value={form.entryDate}
              onChange={(event) =>
                setForm({ ...form, entryDate: event.target.value })
              }
            />
          </FormField>
          <FormField label="Amount" required error={errors.amount}>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount || ""}
              onChange={(event) =>
                setForm({ ...form, amount: Number(event.target.value) })
              }
            />
          </FormField>
          <FormField
            label="Payment account"
            required
            error={errors.paymentAccountId}
          >
            <PaymentOptions
              value={String(form.paymentAccountId || "")}
              onChange={(value) =>
                setForm({ ...form, paymentAccountId: Number(value) })
              }
            />
          </FormField>
          <FormField label="Party" required error={errors.partyName}>
            <Input
              value={form.partyName}
              onChange={(event) =>
                setForm({ ...form, partyName: event.target.value })
              }
            />
          </FormField>
          <FormField label="Description" required error={errors.description}>
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </FormField>
          {!id && (
            <FormField label="Reference number" error={errors.referenceNo}>
              <Input
                value={form.referenceNo ?? ""}
                onChange={(event) =>
                  setForm({ ...form, referenceNo: event.target.value })
                }
              />
            </FormField>
          )}
          <div className="form-actions">
            {id && (
              <Can resource="DIRECT_ENTRY" privilege="DELETE">
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={16} /> Delete
                </Button>
              </Can>
            )}
            <Button type="submit" loading={save.isPending}>
              {id ? "Save changes" : "Create entry"}
            </Button>
          </div>
        </form>
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Delete direct entry?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
};

export const OtherIncomesPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("q") ?? "";
  const fromDate = params.get("from") ?? "";
  const toDate = params.get("to") ?? "";
  const query = useQuery({
    queryKey: ["accounting", "other-incomes", page, search, fromDate, toDate],
    queryFn: () =>
      accountingApi.otherIncomes({
        page: page - 1,
        size: 20,
        searchText: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };
  const columns: DataColumn<OtherIncome>[] = [
    { key: "date", header: "Date", cell: (entry) => entry.entryDate },
    {
      key: "account",
      header: "COA",
      cell: (entry) => entry.coaLabel || entry.coaName || "—",
    },
    {
      key: "paymentAccount",
      header: "Payment account",
      cell: (entry) => (
        <>
          <strong>{entry.paymentAccountName}</strong>
          <small className="cell-subtitle">
            Account #{entry.paymentAccountId}
          </small>
        </>
      ),
    },
    {
      key: "description",
      header: "Details",
      cell: (entry) => (
        <span>
          <strong>{entry.description}</strong>
          <small className="cell-subtitle">
            {entry.partyName}
            {entry.referenceNo ? ` · ${entry.referenceNo}` : ""}
          </small>
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (entry) => (
        <strong
          className={entry.direction === "IN" ? "amount-in" : "amount-out"}
        >
          {entry.direction === "IN" ? "+" : "−"}
          {money(entry.amount)}
        </strong>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Other Income"
        description="Record other income entries."
        actions={
          <Can resource="OTHER_INCOME" privilege="CREATE">
            <Link
              className="button button--primary"
              to="/accounting/other-income/new"
            >
              <Plus size={16} /> New entry
            </Link>
          </Can>
        }
      />
      <SearchFilters
        query={search}
        collapsible
        onQueryChange={(value) => update("q", value)}
      >
        <DateInput
          aria-label="From date"
          value={fromDate}
          onChange={(event) => update("from", event.target.value)}
        />
        <DateInput
          aria-label="To date"
          value={toDate}
          onChange={(event) => update("to", event.target.value)}
        />
      </SearchFilters>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Card>
          <DataTable
            caption="Other income entries"
            columns={columns}
            rows={query.data?.items ?? []}
            rowKey={(entry) => String(entry.id)}
            onRowClick={(entry) =>
              navigate(`/accounting/other-income/${entry.id}`)
            }
          />
          <Pagination
            page={page}
            pageCount={query.data?.totalPages ?? 0}
            onPageChange={(value) => update("page", String(value))}
          />
        </Card>
      )}
    </>
  );
};

const otherIncomeInitial: OtherIncomeInput = {
  entryDate: today(),
  coaId: 0,
  direction: "IN",
  amount: 0,
  paymentAccountId: 0,
  partyName: "",
  description: "",
  notes: "",
};

export const OtherIncomeFormPage = () => {
  const id = parseId(useParams().entryId);
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form, setForm] = useState<OtherIncomeInput>(otherIncomeInitial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const detail = useQuery({
    queryKey: ["accounting", "other-income", id],
    queryFn: () => accountingApi.otherIncome(id as number),
    enabled: id !== null,
  });
  const paymentAccounts = useQuery({
    queryKey: ["accounting", "payment-accounts"],
    queryFn: () => accountingApi.paymentAccounts(),
  });
  useEffect(() => {
    if (detail.data) {
      setForm({
        entryDate: detail.data.entryDate,
        coaId: detail.data.coaId,
        direction: detail.data.direction,
        amount: detail.data.amount,
        paymentAccountId: detail.data.paymentAccountId,
        partyName: detail.data.partyName,
        description: detail.data.description,
        notes: detail.data.notes ?? "",
        version: detail.data.version,
      });
    }
  }, [detail.data]);
  const save = useMutation({
    mutationFn: () =>
      id
        ? accountingApi.updateOtherIncome(id, form)
        : accountingApi.createOtherIncome(form),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["accounting"] });
      toast.success(`Other income ${id ? "updated" : "created"}.`);
      navigate("/accounting/other-income");
    },
    onError: async (error) => {
      const hasFieldErrors = applyServerFieldErrors(
        error,
        setErrors,
        "otherIncome",
        {
          accountId: "coaId",
          party: "partyName",
          date: "entryDate",
        },
      );
      if (error instanceof ApiError && error.status === 409 && id) {
        toast.error("This entry was updated elsewhere. Latest version loaded.");
        const latest = await accountingApi.otherIncome(id);
        setForm((current) => ({ ...current, version: latest.version }));
      } else if (!hasFieldErrors) toast.error(message(error));
    },
  });
  const remove = useMutation({
    mutationFn: () => accountingApi.deleteOtherIncome(id as number),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["accounting"] });
      toast.success("Other income deleted.");
      navigate("/accounting/other-income");
    },
    onError: (error) => toast.error(message(error)),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.coaId)
      next.coaId = validationMessage("otherIncome", "accountId", "REQUIRED");
    if (!form.paymentAccountId)
      next.paymentAccountId = validationMessage(
        "otherIncome",
        "paymentAccountId",
        "REQUIRED",
      );
    if (!required(form.partyName ?? ""))
      next.partyName = validationMessage("otherIncome", "party", "REQUIRED");
    if (!required(form.description ?? ""))
      next.description = validationMessage(
        "otherIncome",
        "description",
        "REQUIRED",
      );
    if (!Number.isFinite(form.amount) || form.amount <= 0)
      next.amount = validationMessage(
        "otherIncome",
        "amount",
        "MUST_BE_POSITIVE",
      );
    if (!required(form.entryDate ?? ""))
      next.entryDate = validationMessage("otherIncome", "date", "REQUIRED");
    else if ((form.entryDate as string) > today())
      next.entryDate = validationMessage("otherIncome", "date", "FUTURE_DATE");
    const selected = paymentAccounts.data?.find(
      (account) => account.id === form.paymentAccountId,
    );
    if (
      selected &&
      form.direction === "OUT" &&
      form.amount > (selected.currentBalance ?? selected.openingBalance)
    )
      next.amount = validationMessage("otherIncome", "amount", "MAXIMUM");
    setErrors(next);
    if (!Object.keys(next).length) save.mutate();
  };
  if ((id && detail.isLoading) || paymentAccounts.isLoading)
    return <LoadingState />;
  return (
    <>
      <PageHeader
        title={id ? "Other Income Detail" : "New Other Income"}
        description={
          id ? "Review or update this entry." : "Create an other income entry."
        }
        actions={
          id ? (
            <AuditHistoryButton
              entityType="other-income"
              entityId={id}
              recordLabel={form.description}
            />
          ) : undefined
        }
      />
      <Card>
        <form className="accounting-form" noValidate onSubmit={submit}>
          <FormField label="Direction" required error={errors.direction}>
            <Select
              value={form.direction}
              onChange={(event) =>
                setForm({
                  ...form,
                  direction: event.target.value as Direction,
                })
              }
              options={[
                { value: "IN", label: "Credit — money in" },
                { value: "OUT", label: "Debit — money out" },
              ]}
            />
          </FormField>
          <FormField label="Chart account" required error={errors.coaId}>
            <AccountOptions
              type="REVENUE"
              value={String(form.coaId || "")}
              onChange={(value) => setForm({ ...form, coaId: Number(value) })}
            />
          </FormField>
          <FormField label="Entry date" required error={errors.entryDate}>
            <DateInput
              max={today()}
              value={form.entryDate ?? ""}
              onChange={(event) =>
                setForm({ ...form, entryDate: event.target.value })
              }
            />
          </FormField>
          <FormField label="Amount" required error={errors.amount}>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount || ""}
              onChange={(event) =>
                setForm({ ...form, amount: Number(event.target.value) })
              }
            />
          </FormField>
          <FormField
            label="Payment account"
            required
            error={errors.paymentAccountId}
          >
            <PaymentOptions
              value={String(form.paymentAccountId || "")}
              onChange={(value) =>
                setForm({ ...form, paymentAccountId: Number(value) })
              }
            />
          </FormField>
          <FormField label="Party" required error={errors.partyName}>
            <Input
              value={form.partyName ?? ""}
              onChange={(event) =>
                setForm({ ...form, partyName: event.target.value })
              }
            />
          </FormField>
          <FormField label="Description" required error={errors.description}>
            <Textarea
              value={form.description ?? ""}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </FormField>
          <FormField label="Notes" error={errors.notes}>
            <Textarea
              value={form.notes ?? ""}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </FormField>
          <div className="form-actions">
            {id && (
              <Can resource="OTHER_INCOME" privilege="DELETE">
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={16} /> Delete
                </Button>
              </Can>
            )}
            <Button type="submit" loading={save.isPending}>
              {id ? "Save changes" : "Create entry"}
            </Button>
          </div>
        </form>
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Delete other income?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
};

export const JournalsPage = () => {
  const navigate = useNavigate();
  const [showManualWarning, setShowManualWarning] = useState(false);
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") ?? "";
  const referenceType = params.get("referenceType") ?? "";
  const fromDate = params.get("from") ?? "";
  const toDate = params.get("to") ?? "";
  const query = useQuery({
    queryKey: [
      "accounting",
      "journals",
      page,
      status,
      referenceType,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      accountingApi.journals({
        page: page - 1,
        size: 20,
        status: status || undefined,
        referenceType: referenceType || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };
  const columns: DataColumn<JournalSummary>[] = [
    { key: "date", header: "Date", cell: (journal) => journal.journalDate },
    {
      key: "description",
      header: "Journal",
      cell: (journal) => (
        <span>
          <strong>{journal.description}</strong>
          <small className="cell-subtitle">
            {humanize(journal.referenceType)}
            {journal.referenceId ? ` · Ref #${journal.referenceId}` : ""}
          </small>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (journal) => (
        <Badge tone={journal.status === "POSTED" ? "success" : "warning"}>
          {journal.status}
        </Badge>
      ),
    },
    {
      key: "lines",
      header: "Lines",
      align: "right",
      cell: (journal) => journal.lineCount,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (journal) => money(journal.totalAmount),
    },
  ];
  return (
    <>
      <PageHeader
        title="Journals"
        description="Posted accounting journals."
        actions={
          <Can resource="JOURNAL" privilege="CREATE">
            <Button onClick={() => setShowManualWarning(true)}>
              <Plus size={16} /> Manual journal
            </Button>
          </Can>
        }
      />
      <SearchFilters query="" collapsible onQueryChange={() => undefined}>
        <Select
          aria-label="Reference type"
          value={referenceType}
          onChange={(event) => set("referenceType", event.target.value)}
          placeholder="All references"
          options={[
            "SALE",
            "PURCHASE",
            "EXPENSE",
            "MANUAL_JOURNAL",
            "SALE_PAYMENT",
            "PURCHASE_PAYMENT",
          ].map((value) => ({ value, label: humanize(value) }))}
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => set("status", event.target.value)}
          placeholder="All statuses"
          options={["POSTED", "DRAFT", "REVERSED"].map((value) => ({
            value,
            label: humanize(value),
          }))}
        />
        <DateInput
          aria-label="From"
          value={fromDate}
          onChange={(event) => set("from", event.target.value)}
        />
        <DateInput
          aria-label="To"
          value={toDate}
          onChange={(event) => set("to", event.target.value)}
        />
      </SearchFilters>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Card>
          <DataTable
            caption="Journals"
            columns={columns}
            rows={query.data?.items ?? []}
            rowKey={(journal) => String(journal.id)}
            onRowClick={(journal) =>
              navigate(`/accounting/journals/${journal.id}`)
            }
          />
          <Pagination
            page={page}
            pageCount={query.data?.totalPages ?? 0}
            onPageChange={(value) => set("page", String(value))}
          />
        </Card>
      )}
      <ConfirmDialog
        open={showManualWarning}
        title="Create manual journal?"
        message="Please note that manual journal entries are reflected only in account reports and are excluded from operational summary reports. Continue only if this is the intended accounting treatment."
        confirmLabel="Continue"
        warning
        onClose={() => setShowManualWarning(false)}
        onConfirm={() => navigate("/accounting/journals/new")}
      />
    </>
  );
};

export const JournalDetailPage = () => {
  const id = parseId(useParams().journalId);
  const query = useQuery({
    queryKey: ["accounting", "journal", id],
    queryFn: () => accountingApi.journal(id as number),
    enabled: id !== null,
  });
  if (!id) return <ErrorState message="Invalid journal." />;
  if (query.isLoading) return <LoadingState />;
  if (query.isError)
    return (
      <QueryError error={query.error} retry={() => void query.refetch()} />
    );
  const journal = query.data;
  if (!journal) return <EmptyState />;
  return (
    <>
      <PageHeader
        title={`Journal #${journal.id}`}
        description={`${journal.journalDate} · ${humanize(journal.referenceType)}`}
      />
      <div className="accounting-stats">
        <StatCard label="Status" value={journal.status} />
        <StatCard label="Total debit" value={money(journal.totalDebit)} />
        <StatCard label="Total credit" value={money(journal.totalCredit)} />
      </div>
      <Card>
        <h2>{journal.description}</h2>
        {journal.reversalOfId && (
          <p>
            Reversal of{" "}
            <Link to={`/accounting/journals/${journal.reversalOfId}`}>
              journal #{journal.reversalOfId}
            </Link>
          </p>
        )}
        <DataTable
          caption="Journal lines"
          rows={journal.lines}
          rowKey={(line) => String(line.id)}
          columns={[
            {
              key: "account",
              header: "Account",
              cell: (line) => `${line.accountCode} — ${line.accountLabel}`,
            },
            {
              key: "description",
              header: "Description",
              cell: (line) => line.description,
            },
            {
              key: "debit",
              header: "Debit",
              align: "right",
              cell: (line) => money(line.debitAmount),
            },
            {
              key: "credit",
              header: "Credit",
              align: "right",
              cell: (line) => money(line.creditAmount),
            },
          ]}
        />
      </Card>
    </>
  );
};

interface DraftLine {
  key: number;
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}
let draftKey = 2;
const blankLine = (key: number): DraftLine => ({
  key,
  accountId: "",
  debit: "",
  credit: "",
  description: "",
});

export const JournalFormPage = () => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [journalDate, setJournalDate] = useState(today());
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([blankLine(1), blankLine(2)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const totalDebit = lines.reduce(
    (sum, line) => sum + (Number(line.debit) || 0),
    0,
  );
  const totalCredit = lines.reduce(
    (sum, line) => sum + (Number(line.credit) || 0),
    0,
  );
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;
  const mutation = useMutation({
    mutationFn: (input: JournalInput) => accountingApi.createJournal(input),
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: ["accounting", "journals"] });
      toast.success("Journal posted.");
      navigate(`/accounting/journals/${result.id}`);
    },
    onError: (error) => {
      const fieldErrors = extractFieldErrors(error);
      if (!fieldErrors.length) {
        toast.error(message(error));
        return;
      }
      setErrors(
        Object.fromEntries(
          fieldErrors.map(({ field, code, message: serverMessage }) => {
            const normalized = normalizeFieldPath(field)
              .replace(/\.debitAmount$/, ".debit")
              .replace(/\.creditAmount$/, ".credit");
            const configField = normalizeFieldPath(field)
              .replace(/^journalDate$/, "date")
              .replace(/^lines\.\d+\.accountId$/, "lines.accountId")
              .replace(
                /^lines\.\d+\.(debitAmount|creditAmount)$/,
                "lines.amount",
              )
              .replace(/^(totalDebit|totalCredit)$/, "lines");
            return [
              normalized === "totalDebit" || normalized === "totalCredit"
                ? "balance"
                : normalized,
              getServerFieldValidationMessage(
                "journal",
                configField,
                code,
                serverMessage,
              ),
            ];
          }),
        ),
      );
    },
  });
  const update = (key: number, patch: Partial<DraftLine>) => {
    setErrors({});
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!required(journalDate))
      next.journalDate = validationMessage("journal", "date", "REQUIRED");
    else if (journalDate > today())
      next.journalDate = validationMessage("journal", "date", "FUTURE_DATE");
    if (!required(description))
      next.description = validationMessage(
        "journal",
        "description",
        "REQUIRED",
      );
    if (lines.length < 2)
      next.lines = validationMessage("journal", "lines", "MIN_LENGTH");
    lines.forEach((line, index) => {
      const prefix = `lines.${index}`;
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      const hasDebit = line.debit.trim().length > 0;
      const hasCredit = line.credit.trim().length > 0;
      const validDebit = hasDebit && Number.isFinite(debit) && debit > 0;
      const validCredit = hasCredit && Number.isFinite(credit) && credit > 0;
      if (!line.accountId)
        next[`${prefix}.accountId`] = validationMessage(
          "journal",
          "lines.accountId",
          "REQUIRED",
        );
      if (hasDebit && !validDebit)
        next[`${prefix}.debit`] = validationMessage(
          "journal",
          "lines.amount",
          "MUST_BE_POSITIVE",
        );
      if (hasCredit && !validCredit)
        next[`${prefix}.credit`] = validationMessage(
          "journal",
          "lines.amount",
          "MUST_BE_POSITIVE",
        );
      if (validDebit && validCredit) {
        next[`${prefix}.debit`] = validationMessage(
          "journal",
          "lines.amount",
          "INVALID_VALUE",
        );
        next[`${prefix}.credit`] = validationMessage(
          "journal",
          "lines.amount",
          "INVALID_VALUE",
        );
      } else if (!validDebit && !validCredit && !hasDebit && !hasCredit) {
        next[`${prefix}.debit`] = validationMessage(
          "journal",
          "lines.amount",
          "REQUIRED",
        );
        next[`${prefix}.credit`] = validationMessage(
          "journal",
          "lines.amount",
          "REQUIRED",
        );
      }
    });
    if (
      !Object.keys(next).some((field) => field.startsWith("lines.")) &&
      !balanced
    ) {
      next.balance = validationMessage("journal", "lines", "BALANCE_MISMATCH");
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({
      journalDate,
      description: description.trim(),
      lines: lines.map((line) => ({
        accountId: Number(line.accountId),
        ...(Number(line.debit) > 0
          ? { debitAmount: Number(line.debit) }
          : { creditAmount: Number(line.credit) }),
        description: line.description.trim() || undefined,
      })),
    });
  };
  return (
    <>
      <PageHeader
        title="Create Manual Journal"
        description="Debits and credits must balance."
      />
      <form noValidate onSubmit={submit}>
        <Card className="accounting-form">
          <FormField label="Journal date" required error={errors.journalDate}>
            <DateInput
              max={today()}
              value={journalDate}
              onChange={(event) => {
                setErrors((current) => ({
                  ...current,
                  journalDate: "",
                }));
                setJournalDate(event.target.value);
              }}
            />
          </FormField>
          <FormField label="Description" required error={errors.description}>
            <Input
              value={description}
              onChange={(event) => {
                setErrors((current) => ({ ...current, description: "" }));
                setDescription(event.target.value);
              }}
            />
          </FormField>
        </Card>
        <div className="journal-lines">
          {lines.map((line, index) => (
            <Card key={line.key} className="journal-line">
              <header>
                <h2>Line {index + 1}</h2>
                {lines.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setErrors({});
                      setLines((current) =>
                        current.filter((item) => item.key !== line.key),
                      );
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </header>
              <FormField
                label="Account"
                required
                error={
                  errors[`lines.${index}.accountId`] ??
                  (index === 0 ? errors.lines : undefined)
                }
              >
                <AccountOptions
                  all
                  value={line.accountId}
                  onChange={(value) => update(line.key, { accountId: value })}
                />
              </FormField>
              <div className="split-fields">
                <FormField
                  label="Debit"
                  error={
                    errors[`lines.${index}.debit`] ??
                    (index === lines.length - 1 ? errors.balance : undefined)
                  }
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.debit}
                    disabled={Number(line.credit) > 0}
                    onChange={(event) =>
                      update(line.key, {
                        debit: event.target.value,
                        credit: event.target.value ? "" : line.credit,
                      })
                    }
                  />
                </FormField>
                <FormField
                  label="Credit"
                  error={
                    errors[`lines.${index}.credit`] ??
                    (index === lines.length - 1 ? errors.balance : undefined)
                  }
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.credit}
                    disabled={Number(line.debit) > 0}
                    onChange={(event) =>
                      update(line.key, {
                        credit: event.target.value,
                        debit: event.target.value ? "" : line.debit,
                      })
                    }
                  />
                </FormField>
              </div>
              <FormField
                label="Line description"
                error={errors[`lines.${index}.description`]}
              >
                <Input
                  value={line.description}
                  onChange={(event) =>
                    update(line.key, { description: event.target.value })
                  }
                />
              </FormField>
            </Card>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setErrors({});
            setLines((current) => [...current, blankLine(++draftKey)]);
          }}
        >
          <Plus size={16} /> Add line
        </Button>
        <Card className="journal-totals">
          <span>
            Debit <strong>{money(totalDebit)}</strong>
          </span>
          <span>
            Credit <strong>{money(totalCredit)}</strong>
          </span>
          <Badge tone={balanced ? "success" : "danger"}>
            {balanced ? "Balanced" : "Not balanced"}
          </Badge>
          <Button type="submit" loading={mutation.isPending}>
            Post journal
          </Button>
        </Card>
      </form>
    </>
  );
};

export const GeneralLedgerPage = () => {
  const [accountId, setAccountId] = useState("");
  const [fromDate, setFromDate] = useState(`${today().slice(0, 4)}-01-01`);
  const [toDate, setToDate] = useState(today());
  const query = useQuery({
    queryKey: ["accounting", "ledger", accountId, fromDate, toDate],
    queryFn: () => accountingApi.ledger(Number(accountId), fromDate, toDate),
    enabled: Boolean(accountId),
  });
  return (
    <>
      <PageHeader
        title="General Ledger"
        description="Account movements and running balance."
        actions={
          <DownloadButton
            disabled={!accountId}
            run={() =>
              accountingApi.downloadLedger(Number(accountId), fromDate, toDate)
            }
          />
        }
      />
      <Card className="report-filters report-filters--ledger">
        <FormField label="Account">
          <AccountOptions all value={accountId} onChange={setAccountId} />
        </FormField>
        <FormField label="From date">
          <DateInput
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </FormField>
        <FormField label="To date">
          <DateInput
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </FormField>
      </Card>
      {!accountId ? (
        <EmptyState
          title="Select an account"
          description="Choose an account to load its ledger."
        />
      ) : query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : query.data ? (
        <>
          <div className="accounting-stats">
            <StatCard
              label={`Opening (${query.data.openingBalanceSide})`}
              value={money(query.data.openingBalance)}
            />
            <StatCard
              label={`Closing (${query.data.closingBalanceSide})`}
              value={money(query.data.closingBalance)}
            />
            <StatCard
              label="Total debit"
              value={money(query.data.totalDebit)}
            />
            <StatCard
              label="Total credit"
              value={money(query.data.totalCredit)}
            />
          </div>
          <Card>
            <DataTable
              caption="General ledger"
              rows={query.data.lines}
              rowKey={(line) =>
                `${line.journalId}-${line.journalDate}-${line.runningBalance}`
              }
              columns={[
                {
                  key: "date",
                  header: "Date",
                  cell: (line) => line.journalDate,
                },
                {
                  key: "description",
                  header: "Description",
                  cell: (line) => (
                    <Link to={`/accounting/journals/${line.journalId}`}>
                      {line.description}
                      <small className="cell-subtitle">
                        {humanize(line.referenceType)} #{line.referenceId}
                      </small>
                    </Link>
                  ),
                },
                {
                  key: "debit",
                  header: "Debit",
                  align: "right",
                  cell: (line) => money(line.debit),
                },
                {
                  key: "credit",
                  header: "Credit",
                  align: "right",
                  cell: (line) => money(line.credit),
                },
                {
                  key: "balance",
                  header: "Balance",
                  align: "right",
                  cell: (line) =>
                    `${money(line.runningBalance)} ${line.runningBalanceSide}`,
                },
              ]}
            />
          </Card>
        </>
      ) : null}
    </>
  );
};

export const TrialBalancePage = () => {
  const [date, setDate] = useState(today());
  const [includeZero, setIncludeZero] = useState(false);
  const query = useQuery({
    queryKey: ["accounting", "trial-balance", date, includeZero],
    queryFn: () => accountingApi.trialBalance(date, includeZero),
  });
  return (
    <>
      <PageHeader
        title="Trial Balance"
        description="Debit and credit balances by account."
        actions={
          <DownloadButton
            run={() => accountingApi.downloadTrialBalance(date, includeZero)}
          />
        }
      />
      <Card className="report-filters report-filters--trial">
        <FormField label="As of date">
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <label className="check-label">
          <input
            type="checkbox"
            checked={includeZero}
            onChange={(e) => setIncludeZero(e.target.checked)}
          />
          Include zero balances
        </label>
      </Card>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className="accounting-stats">
            <StatCard
              label="Total debit"
              value={money(query.data?.totalDebit)}
            />
            <StatCard
              label="Total credit"
              value={money(query.data?.totalCredit)}
            />
            <StatCard
              label="Status"
              value={query.data?.balanced ? "Balanced" : "Out of balance"}
            />
          </div>
          <Card>
            <DataTable
              caption="Trial balance"
              rows={query.data?.lines ?? []}
              rowKey={(line) => String(line.accountId)}
              columns={[
                {
                  key: "account",
                  header: "Account",
                  cell: (line) => `${line.code} — ${line.label}`,
                },
                { key: "type", header: "Type", cell: (line) => line.type },
                {
                  key: "debit",
                  header: "Debit",
                  align: "right",
                  cell: (line) => money(line.totalDebit),
                },
                {
                  key: "credit",
                  header: "Credit",
                  align: "right",
                  cell: (line) => money(line.totalCredit),
                },
                {
                  key: "balance",
                  header: "Net",
                  align: "right",
                  cell: (line) =>
                    `${money(line.netBalance)} ${line.balanceSide}`,
                },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
};

const ReportSection = ({
  title,
  lines,
  total,
  extraLines,
}: {
  title: string;
  lines: ReportAccountLine[];
  total: number;
  extraLines?: Array<{ label: string; balance: number }>;
}) => (
  <Card className="report-section">
    <h2>{title}</h2>
    {lines.length || extraLines?.length ? (
      <>
        {lines.map((line) => (
          <div className="report-row" key={line.accountId}>
            <span>
              {line.code} — {line.label}
            </span>
            <strong>{money(line.balance)}</strong>
          </div>
        ))}
        {extraLines?.map((line) => (
          <div className="report-row" key={line.label}>
            <span>{line.label}</span>
            <strong>{money(line.balance)}</strong>
          </div>
        ))}
      </>
    ) : (
      <p className="muted">No balances.</p>
    )}
    <div className="report-row report-total">
      <span>Total {title}</span>
      <strong>{money(total)}</strong>
    </div>
  </Card>
);

export const JournalBalanceSheetPage = () => {
  const [date, setDate] = useState(today());
  const query = useQuery({
    queryKey: ["accounting", "balance-sheet", date],
    queryFn: () => accountingApi.balanceSheet(date),
  });
  return (
    <>
      <PageHeader
        title="Journal Balance Sheet"
        description="Assets, liabilities and equity from posted journals."
        actions={
          <DownloadButton
            run={() => accountingApi.downloadBalanceSheet(date)}
          />
        }
      />
      <Card className="report-filters">
        <div className="report-date-filter">
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
          <small>
            Showing balances as of{" "}
            <strong>
              {date
                ? new Intl.DateTimeFormat("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(`${date}T00:00:00`))
                : "the selected date"}
            </strong>
          </small>
        </div>
      </Card>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : query.data ? (
        <BalanceSheetView report={query.data} />
      ) : null}
    </>
  );
};

const BalanceSheetView = ({ report }: { report: BalanceSheet }) => (
  <>
    <div className="accounting-stats">
      <StatCard label="Total assets" value={money(report.assets.total)} />
      <StatCard
        label="Liabilities & equity"
        value={money(report.totalLiabilitiesAndEquity)}
      />
      <StatCard
        label="Status"
        value={report.balanced ? "Balanced" : "Review"}
      />
    </div>
    <div className="report-grid">
      <ReportSection
        title="Assets"
        lines={report.assets.accounts}
        total={report.assets.total}
      />
      <ReportSection
        title="Liabilities"
        lines={report.liabilities.accounts}
        total={report.liabilities.total}
      />
      <ReportSection
        title="Equity"
        lines={report.equity.accounts}
        extraLines={[
          {
            label: "Current year earnings",
            balance: report.equity.currentYearEarnings ?? 0,
          },
        ]}
        total={report.equity.total}
      />
    </div>
  </>
);

export const JournalProfitLossPage = () => {
  const [fromDate, setFromDate] = useState(`${today().slice(0, 7)}-01`);
  const [toDate, setToDate] = useState(today());
  const query = useQuery({
    queryKey: ["accounting", "journal-pl", fromDate, toDate],
    queryFn: () => accountingApi.journalProfitLoss(fromDate, toDate),
  });
  return (
    <>
      <PageHeader
        title="P&L Report"
        description="Revenue and expenses from posted journals."
        actions={
          <DownloadButton
            disabled={query.isLoading}
            run={() =>
              accountingApi.downloadJournalProfitLoss(fromDate, toDate)
            }
          />
        }
      />
      <Card className="report-filters report-filters--journal-pl">
        <FormField label="From">
          <DateInput
            required
            max={toDate}
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </FormField>
        <FormField label="To">
          <DateInput
            required
            min={fromDate}
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </FormField>
        <Button
          type="button"
          loading={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
      </Card>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : query.data ? (
        <JournalProfitLossView report={query.data} />
      ) : null}
    </>
  );
};

const JournalProfitLossView = ({ report }: { report: JournalProfitLoss }) => (
  <div className="journal-pl-report">
    <p className="journal-pl-report__period">
      {formatDate(report.fromDate)} — {formatDate(report.toDate)}
    </p>
    <div className="report-grid">
      <ReportSection
        title="Revenue"
        lines={report.revenue.accounts}
        total={report.revenue.total}
      />
      <ReportSection
        title="Expenses"
        lines={report.expenses.accounts}
        total={report.expenses.total}
      />
    </div>
    <Card
      className={`journal-pl-total ${
        report.netProfit >= 0 ? "is-positive" : "is-negative"
      }`}
    >
      <span>{report.netProfit >= 0 ? "Net Profit" : "Net Loss"}</span>
      <strong>{money(report.netProfit)}</strong>
    </Card>
  </div>
);

export const ProfitLossReportPage = () => {
  const [month, setMonth] = useState(thisMonth());
  const allowedMonths = useMemo(() => {
    const current = new Date();
    return Array.from(
      { length: current.getMonth() + 1 },
      (_, index) =>
        `${current.getFullYear()}-${String(index + 1).padStart(2, "0")}`,
    );
  }, []);
  const selectedMonthLabel = useMemo(
    () =>
      new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    [month],
  );
  const query = useQuery({
    queryKey: ["accounting", "pl", month],
    queryFn: () => accountingApi.profitLoss(month),
  });
  return (
    <>
      <PageHeader
        title="Monthly Report"
        description={
          query.data?.period
            ? `Operational performance summary for ${query.data.period}, covering sales, purchases, expenses, and profitability.`
            : "Operational performance summary for the selected month."
        }
        actions={
          <DownloadButton run={() => accountingApi.downloadProfitLoss(month)} />
        }
      />
      <Card className="pl-period">
        <div className="pl-period__head">
          <span>Reporting month</span>
          <strong>{selectedMonthLabel}</strong>
        </div>
        <div className="month-selector" role="group" aria-label="Report month">
          {allowedMonths.map((value) => {
            const date = new Date(`${value}-01T00:00:00`);
            return (
              <button
                className={`month-chip${month === value ? " is-active" : ""}`}
                key={value}
                type="button"
                aria-pressed={month === value}
                onClick={() => setMonth(value)}
              >
                <span>
                  {date.toLocaleDateString("en-IN", { month: "short" })}
                </span>
                <small>'{String(date.getFullYear()).slice(-2)}</small>
              </button>
            );
          })}
        </div>
      </Card>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : query.data ? (
        <ProfitLossView key={month} report={query.data} />
      ) : null}
    </>
  );
};

type SalesFilter = "sold" | "returned" | "all";
type DirectEntryGroup = "INCOME" | "EXPENSE" | "OTHER";

const directEntryGroup = (classification: string): DirectEntryGroup => {
  const value = classification.toUpperCase();
  return value === "INCOME" || value === "EXPENSE" ? value : "OTHER";
};

const ProfitLossView = ({ report }: { report: ProfitLoss }) => {
  const [salesFilter, setSalesFilter] = useState<SalesFilter>("sold");
  const sales = report.sales ?? [];
  const purchases = report.purchases ?? [];
  const expenses = report.expenses ?? [];
  const directEntries = report.directEntries ?? [];
  const filteredSales = sales.filter((sale) =>
    salesFilter === "all"
      ? true
      : salesFilter === "returned"
        ? sale.returned
        : !sale.returned,
  );
  const groupedEntries = directEntries.reduce<
    Record<DirectEntryGroup, typeof directEntries>
  >(
    (groups, entry) => {
      groups[directEntryGroup(entry.classification)].push(entry);
      return groups;
    },
    { INCOME: [], EXPENSE: [], OTHER: [] },
  );
  const groupTotals = {
    INCOME: {
      count: report.directEntryTotals.incomeCount,
      amount: report.directEntryTotals.incomeAmount,
    },
    EXPENSE: {
      count: report.directEntryTotals.expenseCount,
      amount: report.directEntryTotals.expenseAmount,
    },
    OTHER: {
      count: report.directEntryTotals.otherCount,
      amount: report.directEntryTotals.otherAmount,
    },
  };
  const hasGainLoss =
    report.exchangeGain !== 0 ||
    report.exchangeReturnLoss !== 0 ||
    report.purchaseReturnLoss !== 0;
  const profitable = report.netProfit >= 0;
  const flowMax = Math.max(
    report.totalRevenue,
    report.totalOperatingExpenses,
    1,
  );

  return (
    <div className="pl-report">
      <Card className={`pl-hero ${profitable ? "is-positive" : "is-negative"}`}>
        <div className="pl-hero__layout">
          <div className="pl-hero__primary">
            <div className="pl-hero__main">
              <div className="pl-hero__copy">
                <span className="pl-hero__icon" aria-hidden="true">
                  {profitable ? (
                    <TrendingUp size={20} />
                  ) : (
                    <TrendingDown size={20} />
                  )}
                </span>
                <div>
                  <span className="pl-hero__label">
                    {profitable ? "Net Profit" : "Net Loss"}
                  </span>
                  <strong className="pl-hero__value">
                    {money(report.netProfit)}
                  </strong>
                </div>
              </div>
              <Badge tone={profitable ? "success" : "danger"}>
                {report.netMarginPct.toFixed(1)}% margin
              </Badge>
            </div>
            <div className="pl-mix" aria-label="Revenue and expenses">
              <div className="pl-mix__row">
                <div className="pl-mix__head">
                  <span>Revenue</span>
                  <strong>{money(report.totalRevenue)}</strong>
                </div>
                <span className="pl-mix__track">
                  <span
                    className="pl-mix__fill is-in"
                    style={{
                      width: `${(report.totalRevenue / flowMax) * 100}%`,
                    }}
                  />
                </span>
              </div>
              <div className="pl-mix__row">
                <div className="pl-mix__head">
                  <span>Expenses</span>
                  <strong>{money(report.totalOperatingExpenses)}</strong>
                </div>
                <span className="pl-mix__track">
                  <span
                    className="pl-mix__fill is-out"
                    style={{
                      width: `${(report.totalOperatingExpenses / flowMax) * 100}%`,
                    }}
                  />
                </span>
              </div>
            </div>
          </div>
          <div className="pl-breakdown" aria-label="Profit breakdown">
            <p className="pl-breakdown__label">Breakdown</p>
            <div className="pl-breakdown__grid">
              <div className="pl-chip">
                <span>Sales profit</span>
                <strong className={positive(report.salesTotals.profit)}>
                  {money(report.salesTotals.profit)}
                </strong>
              </div>
              <div className="pl-chip">
                <span>Other income</span>
                <strong>{money(report.directEntryTotals.incomeAmount)}</strong>
              </div>
              {report.returnDeductionIncome !== 0 && (
                <div className="pl-chip">
                  <span>Return deduction</span>
                  <strong className="amount-in">
                    +{money(report.returnDeductionIncome)}
                  </strong>
                </div>
              )}
              {hasGainLoss && report.exchangeGain !== 0 && (
                <div className="pl-chip">
                  <span>Exchange gain</span>
                  <strong className="amount-in">
                    +{money(report.exchangeGain)}
                  </strong>
                </div>
              )}
              {hasGainLoss && report.exchangeReturnLoss !== 0 && (
                <div className="pl-chip">
                  <span>Exchange return loss</span>
                  <strong className="amount-out">
                    −{money(report.exchangeReturnLoss)}
                  </strong>
                </div>
              )}
              {hasGainLoss && report.purchaseReturnLoss !== 0 && (
                <div className="pl-chip">
                  <span>Purchase return loss</span>
                  <strong className="amount-out">
                    −{money(report.purchaseReturnLoss)}
                  </strong>
                </div>
              )}
              <div className="pl-chip">
                <span>Adjustments</span>
                <strong>
                  {report.directEntryTotals.expenseAmount ? "−" : ""}
                  {money(report.directEntryTotals.expenseAmount)}
                </strong>
              </div>
              <div className="pl-chip">
                <span>General expenses</span>
                <strong>
                  {report.expenseTotals.amount ? "−" : ""}
                  {money(report.expenseTotals.amount)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="pl-columns">
        <Card className="pl-panel pl-panel--sales">
          <div className="pl-panel__header">
            <div className="pl-panel__heading">
              <span className="pl-panel__icon" aria-hidden="true">
                <CircleDollarSign size={18} />
              </span>
              <div>
                <h2>Sales</h2>
                <p>
                  {report.salesTotals.count} sold ·{" "}
                  {report.salesTotals.returnCount} returned
                </p>
              </div>
            </div>
            <div className="pl-panel__kpis">
              <span>
                Revenue <strong>{money(report.salesTotals.saleRate)}</strong>
              </span>
              <span>
                Profit{" "}
                <strong className={positive(report.salesTotals.profit)}>
                  {money(report.salesTotals.profit)}
                </strong>
              </span>
            </div>
          </div>
          <div className="pl-pills" role="group" aria-label="Filter sales">
            {(["sold", "returned", "all"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`pl-pill${salesFilter === filter ? " is-active" : ""}`}
                aria-pressed={salesFilter === filter}
                onClick={() => setSalesFilter(filter)}
              >
                {humanize(filter)}
              </button>
            ))}
          </div>
          {filteredSales.length ? (
            <div className="pl-list">
              {filteredSales.map((sale) => (
                <article
                  className={`pl-item${sale.returned ? " is-muted" : ""}`}
                  key={sale.saleId}
                >
                  <div className="pl-item__top">
                    <strong>{sale.vehicleNo}</strong>
                    <strong className="pl-item__amount">
                      {money(sale.saleRate)}
                    </strong>
                  </div>
                  <span className="pl-item__meta">
                    {sale.customerName?.trim() || "Walk-in"}
                  </span>
                  <div className="pl-item__foot">
                    <span className={positive(sale.profit)}>
                      Profit {money(sale.profit)}
                    </span>
                    <span className="pl-item__badges">
                      {sale.returned && <Badge>Returned</Badge>}
                      {sale.pendingAmount > 0 && (
                        <Badge tone="warning">
                          {money(sale.pendingAmount)} due
                        </Badge>
                      )}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="pl-empty">
              No {salesFilter === "all" ? "" : `${salesFilter} `}sales this
              month.
            </p>
          )}
        </Card>

        <Card className="pl-panel pl-panel--expenses">
          <div className="pl-panel__header">
            <div className="pl-panel__heading">
              <span className="pl-panel__icon" aria-hidden="true">
                <Receipt size={18} />
              </span>
              <div>
                <h2>Expenses</h2>
                <p>
                  {report.expenseTotals.count} items ·{" "}
                  {money(report.expenseTotals.amount)}
                </p>
              </div>
            </div>
          </div>
          {expenses.length ? (
            <div className="pl-list">
              {expenses.map((expense, index) => (
                <article
                  className="pl-item"
                  key={`${expense.date}-${expense.expenseName}-${index}`}
                >
                  <div className="pl-item__top">
                    <strong>{expense.expenseName}</strong>
                    <strong className="pl-item__amount amount-out">
                      {money(expense.amount)}
                    </strong>
                  </div>
                  <span className="pl-item__meta">
                    {formatDate(expense.date)} · {expense.accountName}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="pl-empty">No expenses this month.</p>
          )}
        </Card>
      </div>

      <div className="pl-columns">
        <Card className="pl-panel pl-panel--income">
          <div className="pl-panel__header">
            <div className="pl-panel__heading">
              <span className="pl-panel__icon" aria-hidden="true">
                <Banknote size={18} />
              </span>
              <div>
                <h2>Other income & adjustments</h2>
                <p>
                  Money in {money(report.directEntryTotals.inAmount)} · Money
                  out {money(report.directEntryTotals.outAmount)}
                </p>
              </div>
            </div>
          </div>
          {directEntries.length ? (
            (["INCOME", "EXPENSE", "OTHER"] as const).map((group) => {
              const total = groupTotals[group];
              if (!total.count && !groupedEntries[group].length) return null;
              return (
                <section className="pl-group" key={group}>
                  <div className="pl-group__head">
                    <div>
                      <h3>{humanize(group)}</h3>
                      <span>
                        {total.count} item{total.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <strong
                      className={
                        group === "INCOME"
                          ? "amount-in"
                          : group === "EXPENSE"
                            ? "amount-out"
                            : "muted"
                      }
                    >
                      {money(total.amount)}
                    </strong>
                  </div>
                  {group === "OTHER" && (
                    <p className="pl-group__note">
                      Capital/drawings — not counted in profit
                    </p>
                  )}
                  {groupedEntries[group].map((entry, index) => (
                    <article
                      className={`pl-item${group === "OTHER" ? " is-muted" : ""}`}
                      key={`${entry.date}-${entry.name}-${index}`}
                    >
                      <div className="pl-item__top">
                        <strong>{entry.name}</strong>
                        <strong
                          className={`pl-item__amount${
                            group === "OTHER"
                              ? " muted"
                              : entry.direction === "OUT"
                                ? " amount-out"
                                : " amount-in"
                          }`}
                        >
                          {entry.direction === "OUT" ? "−" : ""}
                          {money(entry.amount)}
                        </strong>
                      </div>
                      <span className="pl-item__meta">
                        {entry.category} · {entry.accountName}
                      </span>
                    </article>
                  ))}
                </section>
              );
            })
          ) : (
            <p className="pl-empty">No direct entries this month.</p>
          )}
        </Card>

        <Card className="pl-panel pl-panel--cash">
          <div className="pl-panel__heading">
            <span className="pl-panel__icon" aria-hidden="true">
              <Landmark size={18} />
            </span>
            <h2>Cash & Bank</h2>
          </div>
          {report.cashPosition.length ? (
            report.cashPosition.map((account) => (
              <div className="pl-account" key={account.id}>
                <span>
                  {account.name}
                  <small>{humanize(account.accountType)}</small>
                </span>
                <strong>{money(account.balance)}</strong>
              </div>
            ))
          ) : (
            <p className="pl-empty">No cash or bank accounts.</p>
          )}
          <div className="pl-account pl-account--total">
            <span>Total</span>
            <strong>{money(report.totalCashPosition)}</strong>
          </div>
        </Card>
      </div>

      <Card className="pl-panel pl-panel--outstanding">
        <div className="pl-panel__heading">
          <span className="pl-panel__icon" aria-hidden="true">
            <Wallet size={18} />
          </span>
          <h2>Outstanding</h2>
        </div>
        <div className="pl-metrics">
          <div className="pl-metric is-in">
            <span>Receivables</span>
            <strong className="amount-in">
              {money(report.totalReceivables)}
            </strong>
            <small>Till date</small>
            <strong className="amount-in">
              {money(report.totalReceivablesTillDate)}
            </strong>
          </div>
          <div className="pl-metric is-out">
            <span>Payables</span>
            <strong className="amount-out">
              {money(report.totalPayables)}
            </strong>
            <small>Till date</small>
            <strong className="amount-out">
              {money(report.totalPayablesTillDate)}
            </strong>
          </div>
        </div>
      </Card>

      <Card className="pl-panel pl-panel--purchases">
        <details className="pl-fold">
          <summary>
            <span className="pl-panel__heading">
              <span className="pl-panel__icon" aria-hidden="true">
                <ShoppingCart size={18} />
              </span>
              <span>
                <strong>Purchases</strong>
                <small>
                  {report.purchaseTotals.count} vehicles ·{" "}
                  {money(report.purchaseTotals.landedCost)} spent
                </small>
              </span>
            </span>
          </summary>
          {purchases.length ? (
            <div className="pl-list">
              {purchases.map((purchase) => (
                <article
                  className={`pl-item${purchase.returned ? " is-muted" : ""}`}
                  key={purchase.purchaseId}
                >
                  <div className="pl-item__top">
                    <strong>{purchase.vehicleNo}</strong>
                    <strong className="pl-item__amount">
                      {money(purchase.landedCost)}
                    </strong>
                  </div>
                  <span className="pl-item__meta">
                    {purchase.vendorName} · {formatDate(purchase.purchaseDate)}
                  </span>
                  {purchase.returned && (
                    <div className="pl-item__foot">
                      <Badge>Returned</Badge>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="pl-empty">No purchases this month.</p>
          )}
        </details>
      </Card>
    </div>
  );
};

export const MonthlyOverviewPage = () => {
  const [months, setMonths] = useState(6);
  const trend = useQuery({
    queryKey: ["accounting", "trend", months],
    queryFn: () => accountingApi.trend(months),
  });
  const overview = useQuery({
    queryKey: ["accounting", "overview", months],
    queryFn: () => accountingApi.monthlyOverview(months),
  });
  const rows = useMemo(() => {
    const details = new Map(
      (trend.data?.trend ?? []).map((item) => [item.month, item]),
    );
    return (overview.data?.data ?? []).map((item) => ({
      ...item,
      detail: details.get(item.month),
    }));
  }, [overview.data, trend.data]);
  return (
    <>
      <PageHeader
        title="Monthly Overview"
        description="Sales, purchases, expenses and profitability trends."
      />
      <Card className="report-filters">
        <Select
          value={String(months)}
          onChange={(event) => setMonths(Number(event.target.value))}
          options={[3, 6, 12, 24].map((value) => ({
            value: String(value),
            label: `Last ${value} months`,
          }))}
        />
      </Card>
      {trend.isLoading || overview.isLoading ? (
        <LoadingState />
      ) : trend.isError || overview.isError ? (
        <QueryError
          error={trend.error ?? overview.error}
          retry={() => {
            void trend.refetch();
            void overview.refetch();
          }}
        />
      ) : (
        <Card>
          <DataTable
            caption="Monthly accounting overview"
            rows={rows}
            rowKey={(row) => row.month}
            columns={[
              {
                key: "month",
                header: "Month",
                cell: (row) => row.detail?.monthLabel ?? row.month,
              },
              {
                key: "sales",
                header: "Sales",
                align: "right",
                cell: (row) => money(row.totalSales),
              },
              {
                key: "purchase",
                header: "Purchases",
                align: "right",
                cell: (row) => money(row.totalPurchase),
              },
              {
                key: "expenses",
                header: "Expenses",
                align: "right",
                cell: (row) => money(row.totalExpenses),
              },
              {
                key: "profit",
                header: "Profit",
                align: "right",
                cell: (row) => (
                  <strong className={positive(row.totalProfit)}>
                    {money(row.totalProfit)}
                  </strong>
                ),
              },
              {
                key: "margin",
                header: "Gross margin",
                align: "right",
                cell: (row) =>
                  row.detail ? `${row.detail.grossMarginPct.toFixed(2)}%` : "—",
              },
            ]}
          />
        </Card>
      )}
    </>
  );
};

const accountTypeOptions = (
  ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const
).map((value) => ({ value, label: humanize(value) }));

export const ChartOfAccountsPage = () => {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["accounting", "coa", "all"],
    queryFn: () => accountingApi.accounts(false),
  });
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<CoaAccountType>("ASSET");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const open = () => {
    setCreating(true);
    setType("ASSET");
    setLabel("");
    setDescription("");
    setErrors({});
  };
  const mutation = useMutation({
    mutationFn: () =>
      accountingApi.createAccount({
        type,
        label,
        description,
        directPostable: true,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["accounting", "coa"] });
      toast.success("Account created.");
      setCreating(false);
    },
    onError: (error) => {
      const hasFieldErrors = applyServerFieldErrors(
        error,
        setErrors,
        "chartOfAccount",
      );
      if (!hasFieldErrors) toast.error(message(error));
    },
  });
  const save = () => {
    const next: Record<string, string> = {};
    if (!required(label))
      next.label = validationMessage("chartOfAccount", "label", "REQUIRED");
    if (!required(description))
      next.description = validationMessage(
        "chartOfAccount",
        "description",
        "REQUIRED",
      );
    setErrors(next);
    if (!Object.keys(next).length) mutation.mutate();
  };
  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        description="View and create general-ledger accounts. Existing accounts are read-only."
        actions={
          <Button onClick={open}>
            <Plus size={16} /> Add account
          </Button>
        }
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <Card>
          <DataTable
            caption="Chart of accounts"
            rows={(query.data ?? []).slice().sort((a, b) => {
              const codeA = Number(a.code);
              const codeB = Number(b.code);
              return !Number.isNaN(codeA) &&
                !Number.isNaN(codeB) &&
                codeA !== codeB
                ? codeA - codeB
                : a.code.localeCompare(b.code);
            })}
            rowKey={(account) => String(account.id)}
            columns={[
              {
                key: "code",
                header: "Code",
                cell: (account) => account.code,
              },
              {
                key: "account",
                header: "Account",
                cell: (account) => (
                  <>
                    <strong>{account.label}</strong>
                    <small className="cell-subtitle">
                      {account.description}
                    </small>
                  </>
                ),
              },
              {
                key: "type",
                header: "Type",
                cell: (account) => <Badge>{account.type}</Badge>,
              },
              {
                key: "flags",
                header: "Posting",
                cell: (account) =>
                  account.controlEnabled
                    ? "Control account"
                    : account.directPostable
                      ? "Direct postable"
                      : "Journal only",
              },
            ]}
          />
        </Card>
      )}
      <Modal
        open={creating}
        title="Add account"
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button loading={mutation.isPending} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <div className="accounting-form">
          <FormField label="Type" required error={errors.type}>
            <Select
              value={type}
              onChange={(event) =>
                setType(event.target.value as CoaAccountType)
              }
              options={accountTypeOptions}
            />
          </FormField>
          <FormField label="Label" required error={errors.label}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </FormField>
          <FormField label="Description" required error={errors.description}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
        </div>
      </Modal>
    </>
  );
};

export const AccountManagementPage = ChartOfAccountsPage;
