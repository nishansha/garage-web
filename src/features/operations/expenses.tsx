import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  Button,
  ConfirmDialog,
  DataTable,
  DateInput,
  FormField,
  Input,
  PageHeader,
  Pagination,
  SearchFilters,
  Select,
  Textarea,
} from "../../components/ui";
import { Can } from "../../components/Can";
import { AuditHistoryButton } from "../audit/AuditHistory";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  applyFieldValidationErrors,
  getFieldValidationMessage,
  paymentAccountCompanyMismatchMessage,
} from "../../lib/validation";
import { companyApi } from "../../services/company";
import { companyLabel } from "../../hooks/useCompanyScope";
import {
  operationsApi,
  type Expense,
  type ExpenseInput,
  type PaymentAccount,
  type PurchaseExpenseSummary,
  type SearchInput,
} from "../../services/operations";
import { warehouseApi } from "../../services/warehouse";
import {
  FormActions,
  InvalidRoute,
  QueryBoundary,
  RouteFormPage,
  Section,
  notifyError,
  today,
  useCompanyIdFromRecord,
  useNumericParam,
} from "./common";
import { DownloadDocumentButton } from "./OrderDocument";
import { GeneralExpenseDocument } from "./GeneralExpenseDocument";

const GENERAL = "/expenses/general";
const PURCHASE = "/expenses/purchase";

const expenseSchema = z.object({
  date: z
    .string()
    .min(1, getFieldValidationMessage("expense", "date", "REQUIRED")),
  typeId: z
    .number({
      error: getFieldValidationMessage("expense", "typeId", "REQUIRED"),
    })
    .int()
    .positive(getFieldValidationMessage("expense", "typeId", "REQUIRED")),
  amount: z
    .number({
      error: getFieldValidationMessage("expense", "amount", "REQUIRED"),
    })
    .positive(
      getFieldValidationMessage("expense", "amount", "MUST_BE_POSITIVE"),
    ),
  paymentAccountId: z
    .number({
      error: getFieldValidationMessage(
        "expense",
        "paymentAccountId",
        "REQUIRED",
      ),
    })
    .int()
    .positive(
      getFieldValidationMessage("expense", "paymentAccountId", "REQUIRED"),
    ),
  description: z
    .string()
    .refine(
      (value) => value.trim().length > 0,
      getFieldValidationMessage("expense", "description", "REQUIRED"),
    ),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

const paymentAccountBalance = (
  accounts: PaymentAccount[] | undefined,
  accountId: number,
): number | null => {
  const account = accounts?.find((item) => item.id === accountId);
  if (!account) return null;
  return account.currentBalance ?? account.openingBalance ?? null;
};

const paymentAccountLabel = (account: PaymentAccount) =>
  account.accountType === "BANK" && account.bankName
    ? `${account.name} (${account.bankName})`
    : account.name;

export const GeneralExpensesListRoute = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchInput>({});
  const [deleteId, setDeleteId] = useState<number>();
  const client = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["operations", "expenses", "O", page, filters],
    queryFn: () => operationsApi.expenses.list("O", page - 1, 20, filters),
  });
  const deletion = useMutation({
    mutationFn: () => operationsApi.expenses.delete(deleteId!),
    onSuccess: () => {
      setDeleteId(undefined);
      void client.invalidateQueries({ queryKey: ["operations", "expenses"] });
      void client.invalidateQueries({
        queryKey: ["operations", "payment-accounts"],
      });
      toast.success("Expense deleted");
    },
    onError: notifyError,
  });
  return (
    <>
      <PageHeader
        title="General expenses"
        description="Operating expenses paid by the business."
        actions={
          <Can resource="EXPENSE_GENERAL" privilege="CREATE">
            <Link className="button button--primary" to={`${GENERAL}/new`}>
              <Plus /> New expense
            </Link>
          </Can>
        }
      />
      <SearchFilters
        query={filters.searchText ?? ""}
        collapsible
        onQueryChange={(searchText) => {
          setPage(1);
          setFilters({ ...filters, searchText });
        }}
      >
        <DateInput
          aria-label="From date"
          value={filters.fromDate ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, fromDate: event.target.value })
          }
        />
        <DateInput
          aria-label="To date"
          value={filters.toDate ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, toDate: event.target.value })
          }
        />
      </SearchFilters>
      <QueryBoundary pending={query.isPending} error={query.error}>
        <DataTable<Expense>
          caption="General expenses"
          rows={query.data?.expenses ?? []}
          emptyMessage="No general expenses yet"
          emptyDescription="Operating expenses will appear here once they are recorded."
          rowKey={(row) => String(row.id)}
          onRowClick={(row) => navigate(`${GENERAL}/${row.id}`)}
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (row) => formatDate(row.date),
            },
            {
              key: "title",
              header: "Type",
              cell: (row) => row.typeDesc || row.type || row.expenseType || "—",
            },
            {
              key: "description",
              header: "Description",
              cell: (row) => row.description,
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              cell: (row) => formatCurrency(row.amount),
            },
            {
              key: "actions",
              header: "",
              cell: (row) => (
                <span className="operations-inline-actions">
                  <Can resource="EXPENSE_GENERAL" privilege="UPDATE">
                    <Link to={`${GENERAL}/${row.id}/edit`}>Edit</Link>
                  </Can>
                  <Can resource="EXPENSE_GENERAL" privilege="DELETE">
                    <Button variant="ghost" onClick={() => setDeleteId(row.id)}>
                      Delete
                    </Button>
                  </Can>
                </span>
              ),
            },
          ]}
        />
        <Pagination
          page={page}
          pageCount={query.data?.totalPages ?? 0}
          onPageChange={setPage}
        />
      </QueryBoundary>
      <ConfirmDialog
        open={deleteId !== undefined}
        title="Delete expense?"
        message="This permanently deletes the expense and reverses its related accounting entries."
        danger
        loading={deletion.isPending}
        onClose={() => setDeleteId(undefined)}
        onConfirm={() => deletion.mutate()}
      />
    </>
  );
};

export const PurchaseExpensesListRoute = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchInput>({});
  const query = useQuery({
    queryKey: ["operations", "expenses", "P", page, filters],
    queryFn: () => operationsApi.expenses.list("P", page - 1, 20, filters),
  });
  const rows = query.data?.purchases ?? [];
  return (
    <>
      <PageHeader
        title="Purchase expenses"
        description="Vehicle-level landed-cost expenses."
      />
      <SearchFilters
        query={filters.searchText ?? ""}
        collapsible
        onQueryChange={(searchText) => {
          setPage(1);
          setFilters({ ...filters, searchText });
        }}
      >
        <DateInput
          aria-label="From date"
          value={filters.fromDate ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, fromDate: event.target.value })
          }
        />
        <DateInput
          aria-label="To date"
          value={filters.toDate ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, toDate: event.target.value })
          }
        />
      </SearchFilters>
      <QueryBoundary pending={query.isPending} error={query.error}>
        <DataTable<PurchaseExpenseSummary>
          caption="Purchase expense summaries"
          rows={rows}
          emptyMessage="No purchase expenses yet"
          emptyDescription="Vehicles with purchase expenses will appear here."
          rowKey={(row) => String(row.id)}
          onRowClick={(row) => navigate(`${PURCHASE}/${row.id}`)}
          columns={[
            {
              key: "vehicle",
              header: "Vehicle",
              cell: (row) => <strong>{row.vehicleNo}</strong>,
            },
            {
              key: "product",
              header: "Product",
              cell: (row) =>
                [row.brandName, row.modelName, row.variantName]
                  .filter(Boolean)
                  .join(" ") || "—",
            },
            {
              key: "date",
              header: "Purchase date",
              cell: (row) => formatDate(row.date),
            },
            {
              key: "purchase",
              header: "Purchase",
              align: "right",
              cell: (row) => formatCurrency(row.purchaseRate),
            },
            {
              key: "expenses",
              header: "Expenses",
              align: "right",
              cell: (row) => formatCurrency(row.totalExpenses),
            },
          ]}
        />
        <Pagination
          page={page}
          pageCount={query.data?.totalPages ?? 0}
          onPageChange={setPage}
        />
      </QueryBoundary>
    </>
  );
};

const ExpenseEditor = ({
  expense,
  purchaseId,
}: {
  expense?: Expense;
  purchaseId?: number;
}) => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [pickerCompanyId, setPickerCompanyId] = useState<number | "">(
    expense?.companyId ?? "",
  );
  const [pickerWarehouseId, setPickerWarehouseId] = useState<number | "">(
    expense?.warehouseId ?? "",
  );
  const types = useQuery({
    queryKey: ["operations", "catalog", "expense-accounts"],
    queryFn: operationsApi.catalog.expenseAccounts,
  });
  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: companyApi.list,
    enabled: purchaseId == null,
  });
  const companies = useMemo(
    () => (companiesQuery.data ?? []).filter((item) => item.active !== false),
    [companiesQuery.data],
  );
  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehouseApi.list,
    enabled: purchaseId == null && !expense,
  });
  const companyWarehouses = useMemo(() => {
    const companyId =
      typeof pickerCompanyId === "number" ? pickerCompanyId : undefined;
    if (companyId == null) return [];
    return (warehousesQuery.data ?? []).filter(
      (item) => item.companyId === companyId,
    );
  }, [pickerCompanyId, warehousesQuery.data]);
  const purchase = useQuery({
    queryKey: ["operations", "purchase", purchaseId],
    queryFn: () => operationsApi.purchases.detail(purchaseId!),
    enabled: purchaseId != null,
  });
  const purchaseCompanyId = useCompanyIdFromRecord({
    companyId: purchase.data?.companyId,
    warehouseId: purchase.data?.warehouseId,
  });
  useEffect(() => {
    if (purchaseId || pickerCompanyId) return;
    if (expense?.companyId) {
      setPickerCompanyId(expense.companyId);
      return;
    }
    if (companies.length === 1) setPickerCompanyId(companies[0].id);
  }, [companies, expense?.companyId, pickerCompanyId, purchaseId]);
  const resolvedCompanyId =
    purchaseId != null
      ? purchaseCompanyId
      : typeof pickerCompanyId === "number"
        ? pickerCompanyId
        : undefined;
  const accounts = useQuery({
    queryKey: ["operations", "payment-accounts", resolvedCompanyId],
    queryFn: () => operationsApi.paymentAccounts(resolvedCompanyId),
    enabled: resolvedCompanyId != null || expense != null,
  });
  const returnTo = purchaseId ? `${PURCHASE}/${purchaseId}` : GENERAL;
  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: expense?.date ?? today(),
      typeId: expense?.typeId,
      amount: expense?.amount,
      paymentAccountId: expense?.paymentAccountId ?? undefined,
      description: expense?.description ?? "",
    },
  });
  const paymentAccountId = Number(watch("paymentAccountId") || 0);
  const selectedAccount = accounts.data?.find(
    (account) => account.id === paymentAccountId,
  );
  const accountBalance = paymentAccountBalance(accounts.data, paymentAccountId);
  const mutation = useMutation({
    mutationFn: (value: ExpenseInput) =>
      expense
        ? operationsApi.expenses.update(expense.id, {
            ...value,
            version: expense.version,
          })
        : operationsApi.expenses.create(value),
    onSuccess: async () => {
      const invalidations = [
        client.invalidateQueries({ queryKey: ["operations", "expenses"] }),
        client.invalidateQueries({
          queryKey: ["operations", "payment-accounts"],
        }),
      ];
      if (expense) {
        invalidations.push(
          client.invalidateQueries({
            queryKey: ["operations", "expense", expense.id],
          }),
        );
      }
      if (purchaseId) {
        invalidations.push(
          client.invalidateQueries({
            queryKey: ["operations", "purchase-expenses", purchaseId],
          }),
          client.invalidateQueries({
            queryKey: ["operations", "purchase", purchaseId],
          }),
          client.invalidateQueries({ queryKey: ["operations", "stock"] }),
          client.invalidateQueries({
            queryKey: ["operations", "stock-detail"],
          }),
        );
      }
      await Promise.all(invalidations);
      toast.success(expense ? "Expense updated" : "Expense created");
      navigate(returnTo);
    },
    onError: (error) => {
      const mismatch = paymentAccountCompanyMismatchMessage(error);
      if (mismatch) {
        setError("root", { type: "server", message: mismatch });
        return;
      }
      const applied = applyFieldValidationErrors(error, setError, "expense", {
        date: "date",
        typeId: "typeId",
        expenseTypeId: "typeId",
        amount: "amount",
        paymentAccountId: "paymentAccountId",
        accountId: "paymentAccountId",
        description: "description",
      });
      if (!applied) notifyError(error);
    },
  });
  const submit = (data: ExpenseFormValues) => {
    clearErrors("amount");
    if (accountBalance != null && Number(data.amount) > accountBalance) {
      setError("amount", {
        type: "validate",
        message: `Payment amount cannot exceed account balance (${formatCurrency(accountBalance)})`,
      });
      return;
    }
    const value: ExpenseInput = {
      date: data.date,
      amount: data.amount,
      description: data.description,
      typeId: data.typeId,
      paymentAccountId: data.paymentAccountId,
      purchaseId,
      ...(purchaseId == null && typeof pickerWarehouseId === "number"
        ? { warehouseId: pickerWarehouseId }
        : {}),
    };
    mutation.mutate(value);
  };
  return (
    <form
      className="operations-form"
      noValidate
      onSubmit={handleSubmit(submit)}
    >
      {errors.root?.message && (
        <div className="form-validation-summary" role="alert">
          {errors.root.message}
        </div>
      )}
      <Section title="Expense details">
        <div className="operations-form-grid">
          {purchaseId == null && !expense && (
            <>
              <FormField label="Company" required>
                <Select
                  value={pickerCompanyId}
                  onChange={(event) => {
                    const id = Number(event.target.value);
                    setPickerCompanyId(
                      Number.isInteger(id) && id > 0 ? id : "",
                    );
                    setPickerWarehouseId("");
                    setValue("paymentAccountId", 0);
                  }}
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {companyLabel(company)}
                    </option>
                  ))}
                </Select>
              </FormField>
              {typeof pickerCompanyId === "number" && (
                <FormField label="Warehouse">
                  <Select
                    value={pickerWarehouseId}
                    disabled={warehousesQuery.isLoading}
                    onChange={(event) => {
                      const id = Number(event.target.value);
                      setPickerWarehouseId(
                        Number.isInteger(id) && id > 0 ? id : "",
                      );
                    }}
                  >
                    <option value="">Select warehouse</option>
                    {companyWarehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
            </>
          )}
          <FormField label="Date" required error={errors.date?.message}>
            <DateInput required {...register("date")} />
          </FormField>
          <FormField
            label="Expense type"
            required
            error={errors.typeId?.message}
          >
            <Select required {...register("typeId", { valueAsNumber: true })}>
              <option value="">Select type</option>
              {types.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Amount" required error={errors.amount?.message}>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              required
              {...register("amount", {
                valueAsNumber: true,
                onChange: () => clearErrors("amount"),
              })}
            />
          </FormField>
          <FormField
            label="Payment account"
            required
            error={errors.paymentAccountId?.message}
            hint={
              selectedAccount && accountBalance != null
                ? `Available balance: ${formatCurrency(accountBalance)}`
                : undefined
            }
          >
            <Select
              required
              disabled={resolvedCompanyId == null}
              {...register("paymentAccountId", {
                valueAsNumber: true,
                onChange: () => clearErrors(["paymentAccountId", "amount"]),
              })}
            >
              <option value="">Select account</option>
              {accounts.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {paymentAccountLabel(item)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Description"
            required
            error={errors.description?.message}
          >
            <Textarea required {...register("description")} />
          </FormField>
        </div>
      </Section>
      <FormActions
        cancelTo={returnTo}
        pending={mutation.isPending}
        label={expense ? "Update expense" : "Create expense"}
      />
    </form>
  );
};

export const GeneralExpenseCreateRoute = () => (
  <RouteFormPage title="New general expense">
    <ExpenseEditor />
  </RouteFormPage>
);
export const PurchaseExpenseCreateRoute = () => {
  const purchaseId = useNumericParam("purchaseId");
  if (!purchaseId) return <InvalidRoute />;
  return (
    <RouteFormPage title="New purchase expense">
      <ExpenseEditor purchaseId={purchaseId} />
    </RouteFormPage>
  );
};
export const ExpenseEditRoute = () => {
  const id = useNumericParam("expenseId");
  const purchaseId = useNumericParam("purchaseId");
  const query = useQuery({
    queryKey: ["operations", "expense", id],
    queryFn: () => operationsApi.expenses.detail(id!),
    enabled: !!id,
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage title="Edit expense">
      <QueryBoundary pending={query.isPending} error={query.error}>
        {query.data && (
          <ExpenseEditor expense={query.data} purchaseId={purchaseId} />
        )}
      </QueryBoundary>
    </RouteFormPage>
  );
};

export const GeneralExpenseDetailRoute = () => {
  const id = useNumericParam("expenseId");
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const query = useQuery({
    queryKey: ["operations", "expense", id],
    queryFn: () => operationsApi.expenses.detail(id!),
    enabled: !!id,
  });
  const deletion = useMutation({
    mutationFn: () => operationsApi.expenses.delete(id!),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["operations", "expenses"] });
      void client.invalidateQueries({
        queryKey: ["operations", "payment-accounts"],
      });
      toast.success("Expense deleted");
      navigate(GENERAL);
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  return (
    <>
      <PageHeader
        title={query.data?.title || "Expense"}
        actions={
          query.data && (
            <>
              <DownloadDocumentButton />
              <AuditHistoryButton
                entityType="expense"
                entityId={id}
                recordLabel={query.data.title}
              />
              <Can resource="EXPENSE_GENERAL" privilege="UPDATE">
                <Link
                  className="button button--secondary"
                  to={`${GENERAL}/${id}/edit`}
                >
                  Edit
                </Link>
              </Can>
              <Can resource="EXPENSE_GENERAL" privilege="DELETE">
                <Button variant="danger" onClick={() => setConfirm(true)}>
                  Delete
                </Button>
              </Can>
            </>
          )
        }
      />
      <QueryBoundary pending={query.isPending} error={query.error}>
        {query.data && <GeneralExpenseDocument expense={query.data} />}
      </QueryBoundary>
      <ConfirmDialog
        open={confirm}
        title="Delete expense?"
        message="This permanently deletes the expense and reverses related accounting entries where supported."
        danger
        loading={deletion.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => deletion.mutate()}
      />
    </>
  );
};

export const PurchaseExpenseDetailRoute = () => {
  const purchaseId = useNumericParam("purchaseId");
  const [deleteId, setDeleteId] = useState<number>();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["operations", "purchase-expenses", purchaseId],
    queryFn: () => operationsApi.expenses.byPurchase(purchaseId!),
    enabled: !!purchaseId,
  });
  const deletion = useMutation({
    mutationFn: () => operationsApi.expenses.delete(deleteId!),
    onSuccess: () => {
      setDeleteId(undefined);
      void client.invalidateQueries({
        queryKey: ["operations", "purchase-expenses", purchaseId],
      });
      void client.invalidateQueries({ queryKey: ["operations", "expenses"] });
      void client.invalidateQueries({
        queryKey: ["operations", "purchase", purchaseId],
      });
      void client.invalidateQueries({ queryKey: ["operations", "stock"] });
      void client.invalidateQueries({
        queryKey: ["operations", "stock-detail"],
      });
      void client.invalidateQueries({
        queryKey: ["operations", "payment-accounts"],
      });
      toast.success("Expense deleted");
    },
    onError: notifyError,
  });
  if (!purchaseId) return <InvalidRoute />;
  return (
    <>
      <PageHeader
        title="Purchase expenses"
        actions={
          <Can resource="EXPENSE_PURCHASE" privilege="CREATE">
            <Link
              className="button button--primary"
              to={`${PURCHASE}/${purchaseId}/new`}
            >
              <Plus /> Add expense
            </Link>
          </Can>
        }
      />
      <QueryBoundary pending={query.isPending} error={query.error}>
        <DataTable
          caption="Expenses for purchase"
          rows={query.data ?? []}
          emptyMessage="No expenses"
          emptyDescription="Expenses recorded against this purchase will appear here."
          rowKey={(row) => String(row.id)}
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (row) => formatDate(row.date),
            },
            {
              key: "type",
              header: "Type",
              cell: (row) => row.title || row.type || "—",
            },
            {
              key: "description",
              header: "Description",
              cell: (row) => row.description,
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              cell: (row) => formatCurrency(row.amount),
            },
            {
              key: "actions",
              header: "",
              cell: (row) => (
                <span className="operations-inline-actions">
                  <AuditHistoryButton
                    entityType="expense"
                    entityId={row.id}
                    variant="ghost"
                  />
                  <Can resource="EXPENSE_PURCHASE" privilege="UPDATE">
                    <Link to={`${PURCHASE}/${purchaseId}/${row.id}/edit`}>
                      Edit
                    </Link>
                  </Can>
                  <Can resource="EXPENSE_PURCHASE" privilege="DELETE">
                    <Button variant="ghost" onClick={() => setDeleteId(row.id)}>
                      Delete
                    </Button>
                  </Can>
                </span>
              ),
            },
          ]}
        />
      </QueryBoundary>
      <ConfirmDialog
        open={deleteId !== undefined}
        title="Delete purchase expense?"
        message="This expense will be removed from the vehicle's landed cost."
        danger
        loading={deletion.isPending}
        onClose={() => setDeleteId(undefined)}
        onConfirm={() => deletion.mutate()}
      />
    </>
  );
};
