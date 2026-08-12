import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Badge,
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
  type DataColumn,
} from "../../components/ui";
import { Can } from "../../components/Can";
import { AuditHistoryButton } from "../audit/AuditHistory";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  applyFieldValidationErrors,
  getFieldValidationMessage,
} from "../../lib/validation";
import type { ValidationCode } from "../../lib/validation-messages";
import {
  operationsApi,
  type Lookup,
  type Payment,
  type PaymentAccount,
  type PaymentInput,
  type Purchase,
  type PurchaseExpenseInput,
  type PurchaseInput,
  type RcDueReceipt,
  type SearchInput,
} from "../../services/operations";
import { warehouseApi } from "../../services/warehouse";
import {
  DateValue,
  Detail,
  DetailGrid,
  FormActions,
  InvalidRoute,
  Money,
  PaymentForm,
  QueryBoundary,
  RouteFormPage,
  Section,
  invalidateOutstanding,
  notifyError,
  optionalText,
  today,
  useNumericParam,
} from "./common";
import { ApiError } from "../../lib/api";

const optionalId = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;

const PURCHASES = "/purchase/purchases";
const RETURNS = "/purchase/returns";
const RC_DUE_MAXIMUM_MESSAGE =
  "Receipt amount cannot exceed the remaining RCD";

const rcDueReceiptAsPayment = (receipt?: RcDueReceipt): Payment | undefined =>
  receipt
    ? {
        id: receipt.id,
        version: receipt.version,
        amount: receipt.amount,
        paymentDate: receipt.receiptDate,
        paymentMethod: receipt.paymentMethod,
        paymentAccountId: receipt.paymentAccountId,
        referenceNo: receipt.referenceNo ?? undefined,
        notes: receipt.notes ?? undefined,
      }
    : undefined;

const handleRcDueReceiptError = async (
  error: unknown,
  refetchPurchase: () => Promise<unknown>,
) => {
  if (
    error instanceof ApiError &&
    (error.code === "CON_100" || error.code === "CON_101")
  ) {
    toast.error(
      "This RCD receipt changed on the server. Reloaded the latest purchase.",
    );
    await refetchPurchase();
    return;
  }
  notifyError(error);
};

const fieldError = (error: unknown): string | undefined =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string"
    ? error.message
    : undefined;

const collectFormErrors = (
  value: unknown,
  path = "",
): Array<{ path: string; message: string }> => {
  if (!value || typeof value !== "object") return [];
  const message = fieldError(value);
  if (message) return [{ path, message }];
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) =>
      key === "ref" || key === "types"
        ? []
        : collectFormErrors(child, path ? `${path}.${key}` : key),
  );
};

const purchaseValidationMessage = (field: string, code: ValidationCode) =>
  getFieldValidationMessage("purchase", field, code);

const purchaseReturnValidationMessage = (field: string, code: ValidationCode) =>
  getFieldValidationMessage("purchaseReturn", field, code);

const optionalFilterId = (raw: string): number | undefined => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const PURCHASE_FILTER_KEYS = [
  "fromDate",
  "toDate",
  "vehicleNo",
  "brandId",
  "modelId",
  "variantId",
  "fuelTypeId",
  "status",
  "typeId",
  "staffId",
] as const satisfies ReadonlyArray<keyof SearchInput>;

const isActiveFilterValue = (value: unknown) =>
  value !== undefined && value !== null && value !== "";

const countActivePurchaseFilters = (value: SearchInput) =>
  PURCHASE_FILTER_KEYS.filter((key) => isActiveFilterValue(value[key])).length;

const clearPurchaseFilters = (value: SearchInput): SearchInput => ({
  ...(value.searchText ? { searchText: value.searchText } : {}),
});

const PurchaseFilters = ({
  value,
  onChange,
  collapsible = false,
  children,
}: {
  value: SearchInput;
  onChange: (value: SearchInput) => void;
  collapsible?: boolean;
  children?: ReactNode;
}) => {
  const brandId = value.brandId ?? 0;
  const modelId = value.modelId ?? 0;
  const activeFilterCount = countActivePurchaseFilters(value);
  const brands = useQuery({
    queryKey: ["operations", "brands"],
    queryFn: operationsApi.catalog.brands,
  });
  const models = useQuery({
    queryKey: ["operations", "models", brandId],
    queryFn: () => operationsApi.catalog.models(brandId),
    enabled: brandId > 0,
  });
  const variants = useQuery({
    queryKey: ["operations", "variants", brandId, modelId],
    queryFn: () => operationsApi.catalog.variants(brandId, modelId),
    enabled: brandId > 0 && modelId > 0,
  });
  const fuelTypes = useQuery({
    queryKey: ["operations", "lookups", "FUEL_TYPE"],
    queryFn: () => operationsApi.lookups("FUEL_TYPE"),
  });

  return (
    <SearchFilters
      query={value.searchText ?? ""}
      onQueryChange={(searchText) => onChange({ ...value, searchText })}
      collapsible={collapsible}
      activeFilterCount={activeFilterCount}
      onClearFilters={() => onChange(clearPurchaseFilters(value))}
    >
      <DateInput
        aria-label="From date"
        value={value.fromDate ?? ""}
        onChange={(event) =>
          onChange({ ...value, fromDate: event.target.value })
        }
      />
      <DateInput
        aria-label="To date"
        value={value.toDate ?? ""}
        onChange={(event) => onChange({ ...value, toDate: event.target.value })}
      />
      <Input
        aria-label="Vehicle number"
        placeholder="Vehicle number"
        value={value.vehicleNo ?? ""}
        onChange={(event) =>
          onChange({ ...value, vehicleNo: event.target.value })
        }
      />
      <Select
        aria-label="Brand"
        value={brandId || ""}
        onChange={(event) =>
          onChange({
            ...value,
            brandId: optionalFilterId(event.target.value),
            modelId: undefined,
            variantId: undefined,
          })
        }
      >
        <option value="">All brands</option>
        {brands.data?.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Model"
        value={modelId || ""}
        disabled={!brandId}
        onChange={(event) =>
          onChange({
            ...value,
            modelId: optionalFilterId(event.target.value),
            variantId: undefined,
          })
        }
      >
        <option value="">All models</option>
        {models.data?.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Variant"
        value={value.variantId || ""}
        disabled={!modelId}
        onChange={(event) =>
          onChange({
            ...value,
            variantId: optionalFilterId(event.target.value),
          })
        }
      >
        <option value="">All variants</option>
        {variants.data?.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Fuel type"
        value={value.fuelTypeId || ""}
        onChange={(event) =>
          onChange({
            ...value,
            fuelTypeId: optionalFilterId(event.target.value),
          })
        }
      >
        <option value="">All fuel types</option>
        {fuelTypes.data?.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
      {children}
    </SearchFilters>
  );
};

export const PurchasesListRoute = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchInput>({});
  const query = useQuery({
    queryKey: ["operations", "purchases", page, filters],
    queryFn: () => operationsApi.purchases.list(page - 1, 20, filters),
  });
  const rows = query.data?.purchases ?? [];
  const columns: DataColumn<Purchase>[] = [
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row) => <strong>{row.vehicleNo}</strong>,
    },
    { key: "date", header: "Date", cell: (row) => formatDate(row.date) },
    {
      key: "product",
      header: "Product",
      cell: (row) =>
        [row.brandName, row.modelName, row.variantName]
          .filter(Boolean)
          .join(" ") || "—",
    },
    {
      key: "amount",
      header: "Purchase",
      align: "right",
      cell: (row) => formatCurrency(row.purchaseRate),
    },
    {
      key: "sold",
      header: "Status",
      cell: (row) => (
        <Badge
          tone={row.returned ? "warning" : row.sold ? "success" : "neutral"}
        >
          {row.returned ? "Returned" : row.sold ? "Sold" : "Available"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Payment",
      cell: (row) => (
        <Badge
          tone={
            row.exchange
              ? "info"
              : row.paymentStatus === "PAID"
              ? "success"
              : row.paymentStatus === "PARTIAL"
                ? "warning"
                : "danger"
          }
        >
          {row.exchange ? "Trade-in" : (row.paymentStatus ?? "UNPAID")}
        </Badge>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Purchases"
        description="Manage purchased vehicles, costs and vendor payments."
        actions={
          <Can resource="PURCHASE_ORDER" privilege="CREATE">
            <Link className="button button--primary" to={`${PURCHASES}/new`}>
              <Plus aria-hidden="true" /> New purchase
            </Link>
          </Can>
        }
      />
      <PurchaseFilters
        value={filters}
        collapsible
        onChange={(value) => {
          setPage(1);
          setFilters(value);
        }}
      />
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.id)}
          caption="Purchases"
          onRowClick={(row) => navigate(`${PURCHASES}/${row.id}`)}
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

const emptyExpense = (): PurchaseExpenseInput => ({
  date: today(),
  typeId: 0,
  description: "",
  amount: 0,
  paymentAccountId: 0,
});

const purchaseExpensePayload = (
  expense: PurchaseExpenseInput,
): PurchaseExpenseInput => ({
  id: expense.id,
  date: expense.date,
  typeId: expense.typeId,
  description: expense.description,
  amount: expense.amount,
  paymentAccountId: expense.paymentAccountId,
});

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

const PurchaseEditor = ({ purchase }: { purchase?: Purchase }) => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    clearErrors,
    setError,
    setValue,
    watch,
  } = useForm<PurchaseInput>({
    defaultValues: {
      date: purchase?.date ?? today(),
      deliveredDate: purchase?.deliveredDate ?? "",
      vehicleNo: purchase?.vehicleNo ?? "",
      notes: purchase?.notes ?? "",
      brandId: purchase?.brandId ?? 0,
      modelId: purchase?.modelId ?? 0,
      variantId: purchase?.variantId ?? 0,
      colorId: purchase?.colorId ?? 0,
      fuelTypeId: purchase?.fuelTypeId ?? 0,
      transmissionTypeId: purchase?.transmissionTypeId ?? 0,
      segmentId: purchase?.segmentId ?? 0,
      warehouseId: purchase?.warehouseId ?? undefined,
      makeYear: String(purchase?.makeYear ?? ""),
      odometer: String(purchase?.odometer ?? ""),
      purchaseRate: purchase?.purchaseRate ?? 0,
      rcDueAmount: purchase?.rcDueAmount ?? undefined,
      pickupStaffId: purchase?.pickupStaffId ?? undefined,
      pickupLocation: purchase?.pickupLocation ?? "",
      ownerName: purchase?.ownerName ?? "",
      ownerMobileNo: purchase?.ownerMobileNo ?? "",
      ownerAddress: purchase?.ownerAddress ?? "",
      ownerShipSerialNo: purchase?.ownerShipSerialNo ?? "",
      expenses: purchase?.expenses?.map(purchaseExpensePayload) ?? [],
    },
  });
  const {
    fields: expenses,
    append: appendExpense,
    remove: removeExpense,
  } = useFieldArray({
    control,
    name: "expenses",
    keyName: "_fieldId",
  });
  const [brandId, setBrandId] = useState(purchase?.brandId ?? 0);
  const [modelId, setModelId] = useState(purchase?.modelId ?? 0);
  const lookupTypes = ["COLOR", "FUEL_TYPE", "TRANSMISSION_TYPE"];
  const lookups = useQuery({
    queryKey: ["operations", "lookups", "purchase-form"],
    queryFn: async () => ({
      ...Object.fromEntries(
        await Promise.all(
          lookupTypes.map(
            async (type) => [type, await operationsApi.lookups(type)] as const,
          ),
        ),
      ),
      BRAND: await operationsApi.catalog.brands(),
      SEGMENT: await operationsApi.catalog.segments(),
      EXPENSE_TYPE: await operationsApi.catalog.expenseAccounts(),
      STAFF: await operationsApi.catalog.staff(),
    }),
  });
  const models = useQuery({
    queryKey: ["operations", "models", brandId],
    queryFn: () => operationsApi.catalog.models(brandId),
    enabled: brandId > 0,
  });
  const variants = useQuery({
    queryKey: ["operations", "variants", brandId, modelId],
    queryFn: () => operationsApi.catalog.variants(brandId, modelId),
    enabled: brandId > 0 && modelId > 0,
  });
  const accounts = useQuery({
    queryKey: ["operations", "payment-accounts"],
    queryFn: operationsApi.paymentAccounts,
  });
  const warehouses = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehouseApi.list,
  });
  const watchedExpenses = watch("expenses");
  const mutation = useMutation<unknown, Error, PurchaseInput>({
    mutationFn: (value: PurchaseInput) => {
      const payload: PurchaseInput = {
        ...value,
        warehouseId: optionalId(value.warehouseId),
      };
      return purchase
        ? operationsApi.purchases.update(purchase.id, {
            ...payload,
            version: purchase.version,
          })
        : operationsApi.purchases.create(payload);
    },
    onSuccess: async () => {
      const invalidations = [
        client.invalidateQueries({ queryKey: ["operations", "purchases"] }),
        client.invalidateQueries({ queryKey: ["operations", "stock"] }),
        client.invalidateQueries({ queryKey: ["operations", "stock-detail"] }),
        client.invalidateQueries({
          queryKey: ["operations", "stock-products"],
        }),
      ];
      if (purchase) {
        invalidations.push(
          client.invalidateQueries({
            queryKey: ["operations", "purchase", purchase.id],
            refetchType: "all",
          }),
        );
      }
      await Promise.all(invalidations);
      toast.success(purchase ? "Purchase updated" : "Purchase created");
      navigate(purchase ? `${PURCHASES}/${purchase.id}` : PURCHASES);
    },
    onError: (error) => {
      if (!applyFieldValidationErrors(error, setError, "purchase"))
        notifyError(error);
    },
  });
  const submit = handleSubmit(
    (value: PurchaseInput) => {
      clearErrors("expenses");
      const totalsByAccount: Record<number, number> = {};
      let hasBalanceError = false;

      value.expenses.forEach((expense, index) => {
        const accountId = Number(expense.paymentAccountId);
        const amount = Number(expense.amount);
        if (accountId < 1 || amount <= 0) return;

        const balance = paymentAccountBalance(accounts.data, accountId);
        if (balance != null && amount > balance) {
          setError(`expenses.${index}.amount`, {
            type: "validate",
            message: `Payment amount cannot exceed account balance (${formatCurrency(balance)})`,
          });
          hasBalanceError = true;
        }
        totalsByAccount[accountId] = (totalsByAccount[accountId] ?? 0) + amount;
      });

      for (const [accountIdValue, total] of Object.entries(totalsByAccount)) {
        const accountId = Number(accountIdValue);
        const balance = paymentAccountBalance(accounts.data, accountId);
        if (balance == null || total <= balance) continue;

        value.expenses.forEach((expense, index) => {
          if (Number(expense.paymentAccountId) === accountId) {
            setError(`expenses.${index}.amount`, {
              type: "validate",
              message: `Total expenses for this account (${formatCurrency(total)}) cannot exceed account balance (${formatCurrency(balance)})`,
            });
          }
        });
        hasBalanceError = true;
      }

      if (hasBalanceError) {
        toast.error("Purchase expenses exceed the available account balance.");
        return;
      }

      mutation.mutate({
        ...value,
        vehicleNo: value.vehicleNo.trim(),
        deliveredDate: optionalText(value.deliveredDate ?? null),
        notes: optionalText(value.notes ?? null),
        pickupStaffId: value.pickupStaffId || undefined,
        rcDueAmount:
          value.rcDueAmount === undefined ||
          value.rcDueAmount === null ||
          Number.isNaN(value.rcDueAmount)
            ? null
            : value.rcDueAmount,
        expenses: value.expenses.map(purchaseExpensePayload),
      });
    },
    (invalidErrors) => {
      const firstError = collectFormErrors(invalidErrors)[0];
      toast.error(
        firstError
          ? `${firstError.path}: ${firstError.message}`
          : "Please correct the highlighted fields.",
      );
    },
  );
  const lookup = (name: string): Lookup[] =>
    (lookups.data as Record<string, Lookup[]> | undefined)?.[name] ?? [];
  const select = (
    name: "colorId" | "fuelTypeId" | "transmissionTypeId" | "segmentId",
    label: string,
    defaultValue?: number | null,
  ) => (
    <FormField label={label} required error={fieldError(errors[name])}>
      <Select
        key={`${name}-${lookups.isSuccess ? "ready" : "loading"}`}
        {...register(name, {
          required: purchaseValidationMessage(name, "REQUIRED"),
          min: {
            value: 1,
            message: purchaseValidationMessage(name, "REQUIRED"),
          },
          valueAsNumber: true,
        })}
        defaultValue={defaultValue ?? ""}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {lookup(
          name
            .replace("Id", "")
            .replace(/[A-Z]/g, (value) => `_${value}`)
            .toUpperCase(),
        ).map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
    </FormField>
  );
  const validationErrors = collectFormErrors(errors);
  return (
    <form className="operations-form" onSubmit={submit} noValidate>
      {validationErrors.length > 0 && (
        <div className="form-validation-summary" role="alert">
          <strong>Please correct these fields:</strong>
          <ul>
            {validationErrors.map((error) => (
              <li key={error.path}>
                {error.path}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Section title="Vehicle and purchase">
        <div className="operations-form-grid">
          <FormField
            label="Purchase date"
            required
            error={fieldError(errors.date)}
          >
            <DateInput
              {...register("date", {
                required: purchaseValidationMessage("date", "REQUIRED"),
              })}
            />
          </FormField>
          <FormField
            label="Delivered date"
            error={fieldError(errors.deliveredDate)}
          >
            <DateInput {...register("deliveredDate")} />
          </FormField>
          <FormField
            label="Vehicle number"
            required
            error={fieldError(errors.vehicleNo)}
          >
            <Input
              {...register("vehicleNo", {
                required: purchaseValidationMessage("vehicleNo", "REQUIRED"),
                validate: (value) =>
                  value.trim().length > 0 ||
                  purchaseValidationMessage("vehicleNo", "REQUIRED"),
              })}
            />
          </FormField>
          <FormField label="Brand" required error={fieldError(errors.brandId)}>
            <Select
              {...register("brandId", {
                required: purchaseValidationMessage("brandId", "REQUIRED"),
                min: {
                  value: 1,
                  message: purchaseValidationMessage("brandId", "REQUIRED"),
                },
                valueAsNumber: true,
                onChange: (event) => {
                  const value = Number(event.target.value);
                  setBrandId(value);
                  setModelId(0);
                  setValue("modelId", 0);
                  setValue("variantId", 0);
                },
              })}
              value={brandId || ""}
            >
              <option value="">Select brand</option>
              {lookup("BRAND").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Model" required error={fieldError(errors.modelId)}>
            <Select
              {...register("modelId", {
                required: purchaseValidationMessage("modelId", "REQUIRED"),
                min: {
                  value: 1,
                  message: purchaseValidationMessage("modelId", "REQUIRED"),
                },
                valueAsNumber: true,
                onChange: (event) => {
                  setModelId(Number(event.target.value));
                  setValue("variantId", 0);
                },
              })}
              value={modelId || ""}
            >
              <option value="">Select model</option>
              {models.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Variant"
            required
            error={fieldError(errors.variantId)}
          >
            <Select
              key={`variant-${modelId}-${variants.isSuccess ? "ready" : "loading"}`}
              {...register("variantId", {
                required: purchaseValidationMessage("variantId", "REQUIRED"),
                min: {
                  value: 1,
                  message: purchaseValidationMessage("variantId", "REQUIRED"),
                },
                valueAsNumber: true,
              })}
              defaultValue={purchase?.variantId ?? ""}
            >
              <option value="">Select variant</option>
              {variants.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          {select("colorId", "Color", purchase?.colorId)}
          {select("fuelTypeId", "Fuel type", purchase?.fuelTypeId)}
          {select(
            "transmissionTypeId",
            "Transmission type",
            purchase?.transmissionTypeId,
          )}
          {select("segmentId", "Segment", purchase?.segmentId)}
          <FormField
            label="Warehouse"
            error={fieldError(errors.warehouseId)}
          >
            <Select
              {...register("warehouseId", {
                setValueAs: (raw) => optionalId(Number(raw)),
              })}
            >
              <option value="">Select warehouse</option>
              {warehouses.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Make year"
            required
            error={fieldError(errors.makeYear)}
          >
            <Input
              {...register("makeYear", {
                required: purchaseValidationMessage("makeYear", "REQUIRED"),
                min: {
                  value: 1900,
                  message: purchaseValidationMessage(
                    "makeYear",
                    "INVALID_VALUE",
                  ),
                },
              })}
              type="number"
              min="1900"
            />
          </FormField>
          <FormField
            label="Odometer"
            required
            error={fieldError(errors.odometer)}
          >
            <Input
              {...register("odometer", {
                required: purchaseValidationMessage("odometer", "REQUIRED"),
                min: {
                  value: 0,
                  message: purchaseValidationMessage(
                    "odometer",
                    "NON_NEGATIVE",
                  ),
                },
              })}
              type="number"
              min="0"
            />
          </FormField>
          <FormField
            label="Purchase rate"
            required
            error={fieldError(errors.purchaseRate)}
          >
            <Input
              {...register("purchaseRate", {
                required: purchaseValidationMessage("purchaseRate", "REQUIRED"),
                min: {
                  value: 0.01,
                  message: purchaseValidationMessage(
                    "purchaseRate",
                    "MUST_BE_POSITIVE",
                  ),
                },
                valueAsNumber: true,
              })}
              type="number"
              min="0.01"
              step="0.01"
            />
          </FormField>
          <FormField
            label="RCD (refundable from vendor)"
            error={fieldError(errors.rcDueAmount)}
            hint="Optional amount to collect from the vendor at RCD conversion"
          >
            <Input
              {...register("rcDueAmount", {
                setValueAs: (value) =>
                  value === "" || value === null || value === undefined
                    ? undefined
                    : Number(value),
                validate: (value) => {
                  if (value === undefined || value === null) return true;
                  if (Number.isNaN(value))
                    return purchaseValidationMessage(
                      "rcDueAmount",
                      "NON_NEGATIVE",
                    );
                  if (value < 0)
                    return purchaseValidationMessage(
                      "rcDueAmount",
                      "NON_NEGATIVE",
                    );
                  const rate = Number(watch("purchaseRate"));
                  if (Number.isFinite(rate) && value > rate)
                    return purchaseValidationMessage("rcDueAmount", "MAXIMUM");
                  return true;
                },
              })}
              type="number"
              min="0"
              step="0.01"
            />
          </FormField>
          <FormField
            label="Ownership serial number"
            required
            error={fieldError(errors.ownerShipSerialNo)}
          >
            <Input
              {...register("ownerShipSerialNo", {
                required: purchaseValidationMessage(
                  "ownerShipSerialNo",
                  "REQUIRED",
                ),
              })}
            />
          </FormField>
          <FormField label="Notes" error={fieldError(errors.notes)}>
            <Textarea {...register("notes")} />
          </FormField>
        </div>
      </Section>
      <Section title="Vendor and pickup">
        <div className="operations-form-grid">
          <FormField
            label="Owner/vendor name"
            required
            error={fieldError(errors.ownerName)}
          >
            <Input
              {...register("ownerName", {
                required: purchaseValidationMessage("ownerName", "REQUIRED"),
              })}
            />
          </FormField>
          <FormField
            label="Owner mobile"
            required
            error={fieldError(errors.ownerMobileNo)}
          >
            <Input
              {...register("ownerMobileNo", {
                required: purchaseValidationMessage(
                  "ownerMobileNo",
                  "REQUIRED",
                ),
              })}
              type="tel"
            />
          </FormField>
          <FormField
            label="Owner address"
            required
            error={fieldError(errors.ownerAddress)}
          >
            <Input
              {...register("ownerAddress", {
                required: purchaseValidationMessage(
                  "ownerAddress",
                  "REQUIRED",
                ),
              })}
            />
          </FormField>
          <FormField
            label="Pickup staff"
            error={fieldError(errors.pickupStaffId)}
          >
            <Select
              key={`pickup-staff-${lookups.isSuccess ? "ready" : "loading"}`}
              {...register("pickupStaffId", { valueAsNumber: true })}
              defaultValue={purchase?.pickupStaffId ?? ""}
            >
              <option value="">None</option>
              {lookup("STAFF").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Pickup location"
            required
            error={fieldError(errors.pickupLocation)}
          >
            <Input
              {...register("pickupLocation", {
                required: purchaseValidationMessage(
                  "pickupLocation",
                  "REQUIRED",
                ),
              })}
            />
          </FormField>
        </div>
      </Section>
      <Section
        title="Purchase expenses"
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => appendExpense(emptyExpense())}
          >
            <Plus /> Add expense
          </Button>
        }
      >
        {!expenses.length && <p>No purchase expenses.</p>}
        {expenses.map((expense, index) => (
          <fieldset className="operations-repeat-row" key={expense._fieldId}>
            <legend>Expense {index + 1}</legend>
            <input
              type="hidden"
              {...register(`expenses.${index}.id`, {
                setValueAs: (value) =>
                  value === "" || value === undefined
                    ? undefined
                    : Number(value),
              })}
            />
            <FormField
              label="Date"
              required
              error={fieldError(errors.expenses?.[index]?.date)}
            >
              <DateInput
                {...register(`expenses.${index}.date`, {
                  required: purchaseValidationMessage(
                    "expenses.date",
                    "REQUIRED",
                  ),
                })}
              />
            </FormField>
            <FormField
              label="Type"
              required
              error={fieldError(errors.expenses?.[index]?.typeId)}
            >
              <Select
                key={`expense-type-${index}-${lookups.isSuccess ? "ready" : "loading"}`}
                {...register(`expenses.${index}.typeId`, {
                  required: purchaseValidationMessage(
                    "expenses.typeId",
                    "REQUIRED",
                  ),
                  min: {
                    value: 1,
                    message: purchaseValidationMessage(
                      "expenses.typeId",
                      "REQUIRED",
                    ),
                  },
                  valueAsNumber: true,
                })}
              >
                <option value="">Select type</option>
                {lookup("EXPENSE_TYPE").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Description"
              required
              error={fieldError(errors.expenses?.[index]?.description)}
            >
              <Input
                {...register(`expenses.${index}.description`, {
                  required: purchaseValidationMessage(
                    "expenses.description",
                    "REQUIRED",
                  ),
                })}
              />
            </FormField>
            <FormField
              label="Amount"
              required
              error={fieldError(errors.expenses?.[index]?.amount)}
            >
              <Input
                {...register(`expenses.${index}.amount`, {
                  required: purchaseValidationMessage(
                    "expenses.amount",
                    "REQUIRED",
                  ),
                  min: {
                    value: 0.01,
                    message: purchaseValidationMessage(
                      "expenses.amount",
                      "MUST_BE_POSITIVE",
                    ),
                  },
                  valueAsNumber: true,
                })}
                type="number"
                min="0.01"
                step="0.01"
              />
            </FormField>
            <FormField
              label="Payment account"
              required
              error={fieldError(errors.expenses?.[index]?.paymentAccountId)}
              hint={(() => {
                const accountId = Number(
                  watchedExpenses?.[index]?.paymentAccountId,
                );
                const balance = paymentAccountBalance(accounts.data, accountId);
                return accountId > 0 && balance != null
                  ? `Available balance: ${formatCurrency(balance)}`
                  : undefined;
              })()}
            >
              <Select
                key={`expense-account-${index}-${accounts.isSuccess ? "ready" : "loading"}`}
                {...register(`expenses.${index}.paymentAccountId`, {
                  required: purchaseValidationMessage(
                    "expenses.paymentAccountId",
                    "REQUIRED",
                  ),
                  min: {
                    value: 1,
                    message: purchaseValidationMessage(
                      "expenses.paymentAccountId",
                      "REQUIRED",
                    ),
                  },
                  valueAsNumber: true,
                })}
              >
                <option value="">Select account</option>
                {accounts.data?.map((account) => (
                  <option key={account.id} value={account.id}>
                    {paymentAccountLabel(account)}
                  </option>
                ))}
              </Select>
            </FormField>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove expense ${index + 1}`}
              onClick={() => removeExpense(index)}
            >
              <Trash2 />
            </Button>
          </fieldset>
        ))}
      </Section>
      <FormActions
        cancelTo={purchase ? `${PURCHASES}/${purchase.id}` : PURCHASES}
        pending={mutation.isPending}
        label={purchase ? "Update purchase" : "Create purchase"}
      />
    </form>
  );
};

export const PurchaseCreateRoute = () => (
  <RouteFormPage
    title="New purchase"
    description="Record vehicle, vendor and landed-cost information."
  >
    <PurchaseEditor />
  </RouteFormPage>
);

export const PurchaseEditRoute = () => {
  const id = useNumericParam("purchaseId");
  const query = useQuery({
    queryKey: ["operations", "purchase", id],
    queryFn: () => operationsApi.purchases.detail(id!),
    enabled: id !== undefined,
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage title="Edit purchase">
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        {query.data && <PurchaseEditor purchase={query.data} />}
      </QueryBoundary>
    </RouteFormPage>
  );
};

export const PurchaseDetailRoute = () => {
  const id = useNumericParam("purchaseId");
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [deleteRcDueReceiptId, setDeleteRcDueReceiptId] = useState<number>();
  const query = useQuery({
    queryKey: ["operations", "purchase", id],
    queryFn: () => operationsApi.purchases.detail(id!),
    enabled: id !== undefined,
  });
  const deletion = useMutation({
    mutationFn: () => operationsApi.purchases.delete(id!),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["operations", "purchases"] });
      void client.invalidateQueries({ queryKey: ["operations", "stock"] });
      void client.invalidateQueries({ queryKey: ["operations", "stock-detail"] });
      void client.invalidateQueries({
        queryKey: ["operations", "stock-products"],
      });
      toast.success("Purchase deleted");
      navigate(PURCHASES);
    },
    onError: notifyError,
  });
  const rcDueReceiptDeletion = useMutation({
    mutationFn: () =>
      operationsApi.purchases.deleteRcDueReceipt(id!, deleteRcDueReceiptId!),
    onSuccess: async () => {
      setDeleteRcDueReceiptId(undefined);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["operations", "purchase", id] }),
        client.invalidateQueries({ queryKey: ["operations", "purchases"] }),
        invalidateOutstanding(client, "purchase-rc-due"),
      ]);
      toast.success("RCD receipt deleted");
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  const purchase = query.data;
  return (
    <>
      <PageHeader
        title={purchase?.vehicleNo ?? "Purchase"}
        description={
          purchase
            ? `${purchase.brandName} ${purchase.modelName} ${purchase.variantName}`
            : undefined
        }
        actions={
          purchase && (
            <>
              <AuditHistoryButton
                entityType="purchase"
                entityId={id}
                recordLabel={purchase.vehicleNo}
              />
              {!purchase.returned &&
                (purchase.pendingAmount ?? 0) > 0 &&
                purchase.paymentStatus !== "PAID" && (
                  <Can resource="PURCHASE_PAYMENT" privilege="CREATE">
                    <Link
                      className="button button--secondary"
                      to={`${PURCHASES}/${id}/payment`}
                    >
                      Record payment
                    </Link>
                  </Can>
                )}
              {(purchase.pendingRcDueAmount ?? 0) > 0 && (
                <Can resource="PURCHASE_PAYMENT" privilege="CREATE">
                  <Link
                    className="button button--secondary"
                    to={`${PURCHASES}/${id}/rc-due-receipts/new`}
                  >
                    Record RCD Receipt
                  </Link>
                </Can>
              )}
              {purchase.paymentStatus !== "PENDING" &&
                !purchase.sold &&
                !purchase.returned &&
                purchase.inventoryId && (
                  <Can resource="PURCHASE_RETURN" privilege="CREATE">
                    <Link
                      className="button button--secondary"
                      to={`${RETURNS}/new/${purchase.inventoryId}`}
                    >
                      Return Purchase
                    </Link>
                  </Can>
                )}
              {purchase.editable !== false && (
                <Can resource="PURCHASE_ORDER" privilege="UPDATE">
                  <Link
                    className="button button--secondary"
                    to={`${PURCHASES}/${id}/edit`}
                  >
                    Edit
                  </Link>
                </Can>
              )}
              {purchase.paymentStatus === "PENDING" && (
                <Can resource="PURCHASE_ORDER" privilege="DELETE">
                  <Button variant="danger" onClick={() => setConfirm(true)}>
                    Delete
                  </Button>
                </Can>
              )}
            </>
          )
        }
      />
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        {purchase && (
          <>
            <Section title="Purchase details">
              <DetailGrid>
                <Detail
                  label="Purchase date"
                  value={<DateValue value={purchase.date} />}
                />
                <Detail
                  label="Delivered date"
                  value={<DateValue value={purchase.deliveredDate} />}
                />
                <Detail label="Code" value={purchase.code} />
                <Detail label="Color" value={purchase.colorName} />
                <Detail label="Fuel" value={purchase.fuelType} />
                <Detail
                  label="Transmission"
                  value={purchase.transmissionType}
                />
                <Detail label="Segment" value={purchase.segmentName} />
                <Detail label="Warehouse" value={purchase.warehouseName} />
                <Detail label="Make year" value={purchase.makeYear} />
                <Detail label="Odometer" value={purchase.odometer} />
                <Detail
                  label="Ownership serial"
                  value={purchase.ownerShipSerialNo}
                />
                <Detail label="Vendor" value={purchase.ownerName} />
                <Detail label="Mobile" value={purchase.ownerMobileNo} />
                <Detail label="Address" value={purchase.ownerAddress} />
                <Detail label="Pickup staff" value={purchase.pickupStaff} />
                <Detail
                  label="Pickup location"
                  value={purchase.pickupLocation}
                />
                <Detail label="Notes" value={purchase.notes} />
              </DetailGrid>
            </Section>
            <Section title="Amounts">
              <DetailGrid>
                <Detail
                  label="Purchase rate"
                  value={<Money value={purchase.purchaseRate} />}
                />
                <Detail
                  label="Total Amount"
                  value={<Money value={purchase.totalCost} />}
                />
                <Detail
                  label="Paid"
                  value={<Money value={purchase.paidAmount} />}
                />
                <Detail
                  label="Pending"
                  value={<Money value={purchase.pendingAmount} />}
                />
                <Detail label="Status" value={purchase.paymentStatus} />
              </DetailGrid>
            </Section>
            <Section title="Expenses">
              <DataTable
                caption="Purchase expenses"
                rows={purchase.expenses ?? []}
                rowKey={(row) => String(row.id)}
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    cell: (row) => formatDate(row.date),
                  },
                  {
                    key: "desc",
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
                    key: "history",
                    header: "",
                    cell: (row) =>
                      row.id ? (
                        <AuditHistoryButton
                          entityType="expense"
                          entityId={row.id}
                          variant="ghost"
                        />
                      ) : null,
                  },
                ]}
              />
            </Section>
            <Section title="Payments">
              <DataTable
                caption="Purchase payments"
                rows={purchase.payments ?? []}
                rowKey={(row) => String(row.id)}
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    cell: (row) => formatDate(row.paymentDate),
                  },
                  {
                    key: "method",
                    header: "Method",
                    cell: (row) => row.paymentMethod ?? "—",
                  },
                  {
                    key: "reference",
                    header: "Reference",
                    cell: (row) => row.referenceNo ?? "—",
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    align: "right",
                    cell: (row) => formatCurrency(row.amount),
                  },
                  {
                    key: "action",
                    header: "",
                    cell: (row: Payment) => (
                      <span className="operations-inline-actions">
                        <AuditHistoryButton
                          entityType="purchase-payment"
                          entityId={row.id}
                          variant="ghost"
                        />
                        {purchase.editable !== false && (
                          <Link
                            to={`${PURCHASES}/${id}/payments/${row.id}/edit`}
                          >
                            Edit
                          </Link>
                        )}
                      </span>
                    ),
                  },
                ]}
              />
            </Section>
            {(purchase.rcDueAmount ?? 0) > 0 && (
              <>
                <Section title="RCD">
                  <DetailGrid>
                    <Detail
                      label="RCD amount"
                      value={<Money value={purchase.rcDueAmount} />}
                    />
                    <Detail
                      label="Received"
                      value={<Money value={purchase.paidRcDueAmount} />}
                    />
                    <Detail
                      label="Pending"
                      value={<Money value={purchase.pendingRcDueAmount} />}
                    />
                  </DetailGrid>
                </Section>
                <Section
                  title="RCD receipts"
                  actions={
                    (purchase.pendingRcDueAmount ?? 0) > 0 ? (
                      <Can resource="PURCHASE_PAYMENT" privilege="CREATE">
                        <Link
                          className="button button--secondary"
                          to={`${PURCHASES}/${id}/rc-due-receipts/new`}
                        >
                          Record RCD Receipt
                        </Link>
                      </Can>
                    ) : undefined
                  }
                >
                  <DataTable
                    caption="RCD receipts"
                    rows={purchase.rcDueReceipts ?? []}
                    rowKey={(row) => String(row.id)}
                    emptyMessage="No RCD receipts recorded"
                    columns={[
                      {
                        key: "date",
                        header: "Date",
                        cell: (row) => formatDate(row.receiptDate),
                      },
                      {
                        key: "method",
                        header: "Method",
                        cell: (row) => row.paymentMethod,
                      },
                      {
                        key: "account",
                        header: "Account",
                        cell: (row) => row.paymentAccountName,
                      },
                      {
                        key: "reference",
                        header: "Reference",
                        cell: (row) => row.referenceNo ?? "—",
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
                            <Can resource="PURCHASE_PAYMENT" privilege="UPDATE">
                              <Link
                                to={`${PURCHASES}/${id}/rc-due-receipts/${row.id}/edit`}
                              >
                                Edit
                              </Link>
                            </Can>
                            <Can resource="PURCHASE_PAYMENT" privilege="DELETE">
                              <Button
                                variant="ghost"
                                onClick={() => setDeleteRcDueReceiptId(row.id)}
                              >
                                Delete
                              </Button>
                            </Can>
                          </span>
                        ),
                      },
                    ]}
                  />
                </Section>
              </>
            )}
          </>
        )}
      </QueryBoundary>
      <ConfirmDialog
        open={confirm}
        title="Delete purchase?"
        message="This permanently deletes the purchase and related accounting records where allowed."
        danger
        loading={deletion.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => deletion.mutate()}
      />
      <ConfirmDialog
        open={deleteRcDueReceiptId !== undefined}
        title="Delete RCD receipt?"
        message="The RCD receipt and its accounting transaction will be reversed."
        danger
        loading={rcDueReceiptDeletion.isPending}
        onClose={() => setDeleteRcDueReceiptId(undefined)}
        onConfirm={() => rcDueReceiptDeletion.mutate()}
      />
    </>
  );
};

export const PurchasePaymentRoute = () => {
  const id = useNumericParam("purchaseId");
  const paymentId = useNumericParam("paymentId");
  const client = useQueryClient();
  const navigate = useNavigate();
  const purchase = useQuery({
    queryKey: ["operations", "purchase", id],
    queryFn: () => operationsApi.purchases.detail(id!),
    enabled: id !== undefined,
  });
  const payment = purchase.data?.payments?.find(
    (item) => item.id === paymentId,
  );
  const mutation = useMutation({
    mutationFn: (value: PaymentInput) =>
      paymentId
        ? operationsApi.purchases.updatePayment(id!, paymentId, {
            ...value,
            version: payment?.version ?? 0,
          })
        : operationsApi.purchases.payment(id!, value),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["operations", "purchase", id],
        }),
        client.invalidateQueries({ queryKey: ["operations", "purchases"] }),
        invalidateOutstanding(client, "purchase-payables"),
      ]);
      toast.success(paymentId ? "Payment updated" : "Payment recorded");
      navigate(`${PURCHASES}/${id}`);
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage
      title={paymentId ? "Edit purchase payment" : "Record purchase payment"}
    >
      <QueryBoundary pending={purchase.isPending} error={purchase.error}>
        {paymentId && !payment ? (
          <InvalidRoute />
        ) : (
          <PaymentForm
            payment={payment}
            enforceAccountBalance
            defaultAmount={
              paymentId
                ? undefined
                : (purchase.data?.pendingAmount ?? undefined)
            }
            maximum={
              paymentId
                ? undefined
                : (purchase.data?.pendingAmount ?? undefined)
            }
            pending={mutation.isPending}
            cancelTo={`${PURCHASES}/${id}`}
            submitLabel={paymentId ? "Update payment" : "Record payment"}
            onSubmit={(value) => mutation.mutate(value)}
          />
        )}
      </QueryBoundary>
    </RouteFormPage>
  );
};

export const PurchaseRcDueReceiptRoute = () => {
  const id = useNumericParam("purchaseId");
  const receiptId = useNumericParam("receiptId");
  const client = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["operations", "purchase", id],
    queryFn: () => operationsApi.purchases.detail(id!),
    enabled: id !== undefined,
  });
  const receipt = query.data?.rcDueReceipts?.find(
    (item) => item.id === receiptId,
  );
  const payment = rcDueReceiptAsPayment(receipt);
  const maximum = receiptId
    ? (query.data?.pendingRcDueAmount ?? 0) + (receipt?.amount ?? 0)
    : query.data?.pendingRcDueAmount;
  const mutation = useMutation({
    mutationFn: (value: PaymentInput) =>
      receiptId
        ? operationsApi.purchases.updateRcDueReceipt(id!, receiptId, {
            amount: value.amount,
            receiptDate: value.paymentDate,
            paymentMethod: value.paymentMethod,
            paymentAccountId: value.paymentAccountId,
            referenceNo: value.referenceNo,
            notes: value.notes,
            version: receipt?.version ?? 0,
          })
        : operationsApi.purchases.rcDueReceipt(id!, {
            amount: value.amount,
            receiptDate: value.paymentDate,
            paymentMethod: value.paymentMethod,
            paymentAccountId: value.paymentAccountId,
            referenceNo: value.referenceNo,
            notes: value.notes,
          }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["operations", "purchase", id] }),
        client.invalidateQueries({ queryKey: ["operations", "purchases"] }),
        invalidateOutstanding(client, "purchase-rc-due"),
      ]);
      toast.success(
        receiptId ? "RCD receipt updated" : "RCD receipt recorded",
      );
      navigate(`${PURCHASES}/${id}`);
    },
    onError: async (error) => {
      await handleRcDueReceiptError(error, query.refetch);
    },
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage
      title={receiptId ? "Edit RCD receipt" : "Record RCD receipt"}
    >
      <QueryBoundary pending={query.isPending} error={query.error}>
        {receiptId && !receipt ? (
          <InvalidRoute />
        ) : (
          <PaymentForm
            key={`rc-due-${receiptId ?? "new"}-${maximum ?? 0}`}
            payment={payment}
            defaultAmount={receiptId ? undefined : (maximum ?? undefined)}
            maximum={maximum ?? undefined}
            maximumMessage={RC_DUE_MAXIMUM_MESSAGE}
            pending={mutation.isPending}
            cancelTo={`${PURCHASES}/${id}`}
            submitLabel={receiptId ? "Update receipt" : "Record receipt"}
            onSubmit={(value) => mutation.mutate(value)}
          />
        )}
      </QueryBoundary>
    </RouteFormPage>
  );
};

export const PurchaseReturnsListRoute = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchInput>({});
  const query = useQuery({
    queryKey: ["operations", "purchase-returns", page, filters],
    queryFn: () => operationsApi.purchaseReturns.list(page - 1, 20, filters),
  });
  const rows = query.data?.purchasesReturns ?? [];
  return (
    <>
      <PageHeader
        title="Purchase returns"
        description="Vendor returns and expected receipts."
      />
      <PurchaseFilters
        value={filters}
        collapsible
        onChange={(value) => {
          setPage(1);
          setFilters(value);
        }}
      >
        <Select
          aria-label="Return status"
          value={filters.status ?? ""}
          onChange={(event) => {
            setPage(1);
            setFilters({ ...filters, status: event.target.value });
          }}
          options={[
            { value: "", label: "All statuses" },
            { value: "PENDING", label: "Pending" },
            { value: "PARTIAL", label: "Partial" },
            { value: "COMPLETED", label: "Completed" },
          ]}
        />
      </PurchaseFilters>
      <QueryBoundary pending={query.isPending} error={query.error}>
        <DataTable
          caption="Purchase returns"
          rows={rows}
          rowKey={(row) => String(row.id)}
          onRowClick={(row) => navigate(`${RETURNS}/${row.id}`)}
          columns={[
            {
              key: "vehicle",
              header: "Vehicle",
              cell: (row) => <strong>{row.vehicleNo ?? row.uin}</strong>,
            },
            {
              key: "date",
              header: "Return date",
              cell: (row) => formatDate(row.returnDate),
            },
            {
              key: "vendor",
              header: "Vendor",
              cell: (row) => row.vendorName ?? "—",
            },
            {
              key: "refund",
              header: "Expected",
              align: "right",
              cell: (row) => formatCurrency(row.refundAmount),
            },
            {
              key: "remaining",
              header: "Remaining",
              align: "right",
              cell: (row) => formatCurrency(row.remainingReceivable),
            },
            {
              key: "status",
              header: "Status",
              cell: (row) => (
                <Badge
                  tone={row.status === "COMPLETED" ? "success" : "warning"}
                >
                  {row.status}
                </Badge>
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
    </>
  );
};

export const PurchaseReturnDetailRoute = () => {
  const id = useNumericParam("returnId");
  const query = useQuery({
    queryKey: ["operations", "purchase-return", id],
    queryFn: () => operationsApi.purchaseReturns.detail(id!),
    enabled: !!id,
  });
  if (!id) return <InvalidRoute />;
  const item = query.data;
  return (
    <>
      <PageHeader
        title={item?.vehicleNo ?? "Purchase return"}
        actions={
          item && (
            <>
              <AuditHistoryButton
                entityType="purchase-return"
                entityId={id}
                recordLabel={item.vehicleNo ?? undefined}
              />
              {item.status === "PENDING" && (
                <Link
                  className="button button--primary"
                  to={`${RETURNS}/${id}/receipt`}
                >
                  Record receipt
                </Link>
              )}
            </>
          )
        }
      />
      <QueryBoundary pending={query.isPending} error={query.error}>
        {item && (
          <>
            <Section title="Return details">
              <DetailGrid>
                <Detail label="UIN" value={item.uin} />
                <Detail
                  label="Purchase reference"
                  value={item.purchaseReferenceNo}
                />
                <Detail
                  label="Return date"
                  value={<DateValue value={item.returnDate} />}
                />
                <Detail label="Vendor" value={item.vendorName} />
                <Detail label="Reason" value={item.reason} />
                <Detail label="Notes" value={item.notes} />
                <Detail
                  label="Landed cost"
                  value={<Money value={item.inventoryLandedCost} />}
                />
                <Detail
                  label="Vendor invoice"
                  value={<Money value={item.vendorInvoiceAmount} />}
                />
                <Detail
                  label="Paid to vendor"
                  value={<Money value={item.paidToVendor} />}
                />
                <Detail
                  label="Outstanding AP"
                  value={<Money value={item.outstandingAp} />}
                />
                <Detail
                  label="Refund expected"
                  value={<Money value={item.refundAmount} />}
                />
                <Detail
                  label="Loss on return"
                  value={<Money value={item.lossOnReturn} />}
                />
                <Detail
                  label="Received"
                  value={<Money value={item.totalReceived} />}
                />
                <Detail
                  label="Remaining"
                  value={<Money value={item.remainingReceivable} />}
                />
                <Detail label="Status" value={item.status} />
              </DetailGrid>
            </Section>
            <Section title="Receipts">
              <DataTable
                caption="Return receipts"
                rows={item.receipts}
                rowKey={(row) => String(row.id)}
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    cell: (row) => formatDate(row.paymentDate),
                  },
                  {
                    key: "reference",
                    header: "Reference",
                    cell: (row) => row.referenceNo ?? "—",
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    align: "right",
                    cell: (row) => formatCurrency(row.amount),
                  },
                  {
                    key: "action",
                    header: "",
                    cell: (row) => (
                      <span className="operations-inline-actions">
                        <AuditHistoryButton
                          entityType="purchase-return-receipt"
                          entityId={row.id}
                          variant="ghost"
                        />
                        <Link to={`${RETURNS}/${id}/receipts/${row.id}/edit`}>
                          Edit
                        </Link>
                      </span>
                    ),
                  },
                ]}
              />
            </Section>
          </>
        )}
      </QueryBoundary>
    </>
  );
};

export const PurchaseReturnCreateRoute = () => {
  const inventoryId = useNumericParam("inventoryId");
  const navigate = useNavigate();
  const client = useQueryClient();
  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
  } = useForm<{
    returnDate: string;
    reason: string;
    notes?: string;
    refundAmount: number;
  }>();
  const formData = useQuery({
    queryKey: ["operations", "purchase-return-form", inventoryId],
    queryFn: () => operationsApi.purchaseReturns.formData(inventoryId!),
    enabled: !!inventoryId,
  });
  const mutation = useMutation({
    mutationFn: (value: {
      returnDate: string;
      reason: string;
      notes?: string;
      refundAmount?: number;
    }) => operationsApi.purchaseReturns.create(inventoryId!, value),
    onSuccess: (response) => {
      void client.invalidateQueries({ queryKey: ["operations", "stock"] });
      void client.invalidateQueries({ queryKey: ["operations", "stock-detail"] });
      void client.invalidateQueries({
        queryKey: ["operations", "stock-products"],
      });
      void client.invalidateQueries({ queryKey: ["operations", "purchases"] });
      void client.invalidateQueries({
        queryKey: ["operations", "purchase-returns"],
      });
      toast.success("Purchase return created");
      navigate(`${RETURNS}/${response.id}`);
    },
    onError: (error) => {
      if (!applyFieldValidationErrors(error, setError, "purchaseReturn"))
        notifyError(error);
    },
  });
  if (!inventoryId) return <InvalidRoute />;
  const submit = handleSubmit((value) =>
    mutation.mutate({
      ...value,
      notes: optionalText(value.notes ?? null),
    }),
  );
  return (
    <RouteFormPage title="Return vehicle to vendor">
      <QueryBoundary pending={formData.isPending} error={formData.error}>
        {formData.data && (
          <form className="operations-form" onSubmit={submit} noValidate>
            <Section title="Purchase summary">
              <DetailGrid>
                <Detail label="Vehicle" value={formData.data.vehicleNo} />
                <Detail label="UIN" value={formData.data.uin} />
                <Detail label="Vendor" value={formData.data.vendorName} />
                <Detail
                  label="Landed cost"
                  value={<Money value={formData.data.inventoryLandedCost} />}
                />
                <Detail
                  label="Paid to vendor"
                  value={<Money value={formData.data.paidToVendor} />}
                />
                <Detail
                  label="Maximum refund"
                  value={<Money value={formData.data.maxRefundAmount} />}
                />
              </DetailGrid>
            </Section>
            <Section title="Return">
              <div className="operations-form-grid">
                <FormField
                  label="Return date"
                  required
                  error={fieldError(errors.returnDate)}
                >
                  <DateInput
                    {...register("returnDate", {
                      required: purchaseReturnValidationMessage(
                        "returnDate",
                        "REQUIRED",
                      ),
                    })}
                    defaultValue={today()}
                  />
                </FormField>
                <FormField
                  label="Refund amount"
                  required
                  error={fieldError(errors.refundAmount)}
                >
                  <Input
                    {...register("refundAmount", {
                      required: purchaseReturnValidationMessage(
                        "refundAmount",
                        "REQUIRED",
                      ),
                      min: {
                        value: 0,
                        message: purchaseReturnValidationMessage(
                          "refundAmount",
                          "NON_NEGATIVE",
                        ),
                      },
                      max: {
                        value: formData.data.maxRefundAmount,
                        message: purchaseReturnValidationMessage(
                          "refundAmount",
                          "MAXIMUM",
                        ),
                      },
                      valueAsNumber: true,
                    })}
                    type="number"
                    min="0"
                    max={formData.data.maxRefundAmount}
                    step="0.01"
                    defaultValue={formData.data.suggestedRefundAmount}
                  />
                </FormField>
                <FormField
                  label="Reason"
                  required
                  error={fieldError(errors.reason)}
                >
                  <Textarea
                    {...register("reason", {
                      required: purchaseReturnValidationMessage(
                        "reason",
                        "REQUIRED",
                      ),
                    })}
                  />
                </FormField>
                <FormField label="Notes" error={fieldError(errors.notes)}>
                  <Textarea {...register("notes")} />
                </FormField>
              </div>
            </Section>
            <FormActions
              cancelTo="/inventory/stock"
              pending={mutation.isPending}
              label="Create return"
            />
          </form>
        )}
      </QueryBoundary>
    </RouteFormPage>
  );
};

export const PurchaseReturnReceiptRoute = () => {
  const id = useNumericParam("returnId");
  const receiptId = useNumericParam("receiptId");
  const client = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["operations", "purchase-return", id],
    queryFn: () => operationsApi.purchaseReturns.detail(id!),
    enabled: !!id,
  });
  const receipt = query.data?.receipts.find((item) => item.id === receiptId);
  const mutation = useMutation({
    mutationFn: (value: PaymentInput) =>
      receiptId
        ? operationsApi.purchaseReturns.updateReceipt(id!, receiptId, {
            ...value,
            version: receipt?.version ?? 0,
          })
        : operationsApi.purchaseReturns.receipt(id!, value),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["operations", "purchase-return", id],
        }),
        client.invalidateQueries({
          queryKey: ["operations", "purchase-returns"],
        }),
        invalidateOutstanding(client, "purchase-return-receivables"),
      ]);
      toast.success(receiptId ? "Receipt updated" : "Receipt recorded");
      navigate(`${RETURNS}/${id}`);
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage
      title={receiptId ? "Edit return receipt" : "Record return receipt"}
    >
      <QueryBoundary pending={query.isPending} error={query.error}>
        {receiptId && !receipt ? (
          <InvalidRoute />
        ) : (
          <PaymentForm
            payment={receipt}
            defaultAmount={
              receiptId ? undefined : query.data?.remainingReceivable
            }
            maximum={receiptId ? undefined : query.data?.remainingReceivable}
            maximumMessage={purchaseReturnValidationMessage(
              "receiptAmount",
              "MAXIMUM",
            )}
            pending={mutation.isPending}
            cancelTo={`${RETURNS}/${id}`}
            submitLabel={receiptId ? "Update receipt" : "Record receipt"}
            onSubmit={(value) => mutation.mutate(value)}
          />
        )}
      </QueryBoundary>
    </RouteFormPage>
  );
};
