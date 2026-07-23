import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
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
} from "../../components/ui";
import { Can } from "../../components/Can";
import { AuditHistoryButton } from "../audit/AuditHistory";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  extractFieldErrors,
  getFieldValidationMessage,
  normalizeFieldPath,
  tryApplyManualFieldValidationErrors,
} from "../../lib/validation";
import {
  operationsApi,
  type AmountSplit,
  type Deduction,
  type ExchangeExpense,
  type ExchangeHandling,
  type Lookup,
  type PaymentAccount,
  type PaymentInput,
  type PayerType,
  type Sale,
  type SaleInput,
  type SearchInput,
} from "../../services/operations";
import {
  Detail,
  DetailGrid,
  FormActions,
  InvalidRoute,
  Money,
  PaymentForm,
  QueryBoundary,
  RouteFormPage,
  Section,
  notifyError,
  numberValue,
  optionalText,
  today,
  useNumericParam,
} from "./common";

const SALES = "/sales/sales";
const RETURNS = "/sales/returns";
const CURRENT_YEAR = new Date().getFullYear();

type FieldErrors = Record<string, string>;
type ValidationModule = Parameters<typeof getFieldValidationMessage>[0];
type ValidationCode = Parameters<typeof getFieldValidationMessage>[2];

const requiredText = z.string().trim().min(1, "REQUIRED");
const requiredSelection = requiredText.refine(
  (value) => Number.isInteger(Number(value)) && Number(value) > 0,
  "INVALID_VALUE",
);
const positiveAmount = requiredText.refine(
  (value) => Number.isFinite(Number(value)) && Number(value) > 0,
  "MUST_BE_POSITIVE",
);
const nonNegativeAmount = requiredText.refine(
  (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
  "NON_NEGATIVE",
);
const nonNegativeInteger = requiredText.refine(
  (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
  "NON_NEGATIVE",
);

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
const makeYear = requiredText.refine((value) => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= CURRENT_YEAR;
}, "INVALID_VALUE");

const validateField = (
  errors: FieldErrors,
  moduleName: ValidationModule,
  field: string,
  value: FormDataEntryValue | null,
  schema: z.ZodType<string>,
  configField = field,
) => {
  const result = schema.safeParse(String(value ?? ""));
  if (!result.success) {
    errors[field] = getFieldValidationMessage(
      moduleName,
      configField,
      (result.error.issues[0]?.message ?? "INVALID_VALUE") as ValidationCode,
    );
  }
};

const saleServerField = (field: string) => {
  const normalized = normalizeFieldPath(field);
  if (normalized.startsWith("amountSplits.")) {
    return normalized.replace("amountSplits.", "splits.");
  }
  if (normalized.startsWith("exchangeVehicleDetails.expenses.")) {
    return normalized.replace(
      "exchangeVehicleDetails.expenses.",
      "exchangeExpenses.",
    );
  }
  if (normalized.startsWith("exchangeVehicleDetails.")) {
    return normalized.replace("exchangeVehicleDetails.", "exchange.");
  }
  return normalized;
};

const returnServerField = (field: string) => {
  const normalized = normalizeFieldPath(field);
  if (normalized.startsWith("soldVehicleDeductions.")) {
    return normalized.replace("soldVehicleDeductions.", "sold.");
  }
  if (normalized.startsWith("exchangeVehicleDeductions.")) {
    return normalized.replace("exchangeVehicleDeductions.", "exchange.");
  }
  return normalized;
};

const applyServerErrors = (
  error: unknown,
  setErrors: (errors: FieldErrors) => void,
  moduleName: ValidationModule,
  mapField: (field: string) => string,
) => {
  const fieldMap = Object.fromEntries(
    extractFieldErrors(error).flatMap(({ field }) => {
      const normalizedField = normalizeFieldPath(field);
      const mappedField = mapField(normalizedField);
      return [
        [field, mappedField],
        [normalizedField, mappedField],
      ];
    }),
  );
  if (
    !tryApplyManualFieldValidationErrors(error, setErrors, moduleName, fieldMap)
  ) {
    notifyError(error);
  }
};

export const SalesListRoute = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchInput>({});
  const query = useQuery({
    queryKey: ["operations", "sales", page, filters],
    queryFn: () => operationsApi.sales.list(page - 1, 20, filters),
  });
  const rows = query.data?.sales ?? [];
  return (
    <>
      <PageHeader
        title="Sales"
        description="Manage vehicle sales, exchanges, finance and receipts."
        actions={
          <Can resource="SALE" privilege="CREATE">
            <Link className="button button--primary" to={`${SALES}/new`}>
              <Plus /> New sale
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
        <Input
          aria-label="Vehicle number"
          placeholder="Vehicle number"
          value={filters.vehicleNo ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, vehicleNo: event.target.value })
          }
        />
      </SearchFilters>
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <DataTable
          caption="Sales"
          rows={rows}
          rowKey={(row) => String(row.id)}
          onRowClick={(row) => navigate(`${SALES}/${row.id}`)}
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
              header: "Date",
              cell: (row) => formatDate(row.date),
            },
            {
              key: "customer",
              header: "Customer",
              cell: (row) => row.customerName ?? "—",
            },
            {
              key: "sale",
              header: "Sale",
              align: "right",
              cell: (row) => formatCurrency(row.saleRate),
            },
            {
              key: "profit",
              header: "Profit",
              align: "right",
              cell: (row) => formatCurrency(row.profit),
            },
            {
              key: "status",
              header: "Payment",
              cell: (row) => (
                <Badge
                  tone={row.paymentStatus === "PAID" ? "success" : "warning"}
                >
                  {row.paymentStatus ?? "PENDING"}
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

const SaleEditor = ({ sale }: { sale?: Sale }) => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const exchangeVehicle = sale?.exchangeVehicleDetails;
  const [errors, setErrors] = useState<FieldErrors>({});
  const [exchanged, setExchanged] = useState(sale?.exchange ?? false);
  const [financed, setFinanced] = useState(sale?.financed ?? false);
  const [exchangeAmount, setExchangeAmount] = useState(
    sale?.exchangeAmount == null ? "" : String(sale.exchangeAmount),
  );
  const [exchangeBrandId, setExchangeBrandId] = useState(
    exchangeVehicle?.brandId ?? 0,
  );
  const [exchangeModelId, setExchangeModelId] = useState(
    exchangeVehicle?.modelId ?? 0,
  );
  const [splits, setSplits] = useState<AmountSplit[]>(sale?.amountSplits ?? []);
  const [exchangeExpenses, setExchangeExpenses] = useState<ExchangeExpense[]>(
    exchangeVehicle?.expenses?.map((expense) => ({
      ...expense,
      paymentAccountId: expense.paymentAccountId ?? 0,
    })) ?? [],
  );
  const products = useQuery({
    queryKey: ["operations", "stock-products"],
    queryFn: operationsApi.stock.products,
  });
  const lookupTypes = [
    "COLOR",
    "FUEL_TYPE",
    "TRANSMISSION_TYPE",
    "SALE_SPLIT_TYPE",
  ];
  const lookups = useQuery({
    queryKey: ["operations", "lookups", "sale-form"],
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
    }),
  });
  const exchangeModels = useQuery({
    queryKey: ["operations", "models", exchangeBrandId],
    queryFn: () => operationsApi.catalog.models(exchangeBrandId),
    enabled: exchangeBrandId > 0,
  });
  const exchangeVariants = useQuery({
    queryKey: ["operations", "variants", exchangeBrandId, exchangeModelId],
    queryFn: () =>
      operationsApi.catalog.variants(exchangeBrandId, exchangeModelId),
    enabled: exchangeBrandId > 0 && exchangeModelId > 0,
  });
  const accounts = useQuery({
    queryKey: ["operations", "payment-accounts"],
    queryFn: operationsApi.paymentAccounts,
  });
  const mutation = useMutation<unknown, Error, SaleInput>({
    mutationFn: async (value: SaleInput) => {
      if (sale) {
        return operationsApi.sales.update(sale.id, {
          ...value,
          version: sale.version,
        });
      }
      const createdSale = await operationsApi.sales.create(value);
      return operationsApi.sales.detail(createdSale.id);
    },
    onSuccess: (response) => {
      void client.invalidateQueries({ queryKey: ["operations", "sales"] });
      void client.invalidateQueries({ queryKey: ["operations", "stock"] });
      void client.invalidateQueries({ queryKey: ["operations", "stock-detail"] });
      void client.invalidateQueries({
        queryKey: ["operations", "stock-products"],
      });
      toast.success(sale ? "Sale updated" : "Sale created");
      const responseId =
        typeof response === "object" &&
        response !== null &&
        "id" in response &&
        typeof response.id === "number"
          ? response.id
          : sale?.id;
      const responseStatus =
        typeof response === "object" &&
        response !== null &&
        "paymentStatus" in response
          ? response.paymentStatus
          : undefined;
      navigate(
        responseId
          ? !sale && responseStatus !== "PAID"
            ? `${SALES}/${responseId}/payment`
            : `${SALES}/${responseId}`
          : SALES,
      );
    },
    onError: (error) =>
      applyServerErrors(error, setErrors, "sale", saleServerField),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors: FieldErrors = {};
    const validateSaleField = (
      field: string,
      value: FormDataEntryValue | null,
      schema: z.ZodType<string>,
      configField = field,
    ) => validateField(nextErrors, "sale", field, value, schema, configField);
    validateSaleField("date", data.get("date"), requiredText);
    validateSaleField("stockId", data.get("stockId"), requiredSelection);
    validateSaleField("saleRate", data.get("saleRate"), positiveAmount);
    validateSaleField("customerName", data.get("customerName"), requiredText);
    validateSaleField(
      "customerMobileNo",
      data.get("customerMobileNo"),
      requiredText,
    );
    validateSaleField(
      "customerAddress",
      data.get("customerAddress"),
      requiredText,
    );
    splits.forEach((_, index) => {
      validateSaleField(
        `splits.${index}.typeId`,
        data.get(`splits.${index}.typeId`),
        requiredSelection,
        "amountSplits.typeId",
      );
      validateSaleField(
        `splits.${index}.amount`,
        data.get(`splits.${index}.amount`),
        nonNegativeAmount,
        "amountSplits.amount",
      );
    });
    if (exchanged) {
      validateSaleField(
        "exchangeAmount",
        data.get("exchangeAmount"),
        nonNegativeAmount,
      );
      validateSaleField(
        "exchange.vehicleNo",
        data.get("exchange.vehicleNo"),
        requiredText,
      );
      [
        "brandId",
        "modelId",
        "variantId",
        "colorId",
        "fuelTypeId",
        "transmissionTypeId",
        "segmentId",
        "warehouseId",
      ].forEach((field) =>
        validateSaleField(
          `exchange.${field}`,
          data.get(`exchange.${field}`),
          requiredSelection,
        ),
      );
      validateSaleField(
        "exchange.makeYear",
        data.get("exchange.makeYear"),
        makeYear,
      );
      validateSaleField(
        "exchange.odometer",
        data.get("exchange.odometer"),
        nonNegativeInteger,
      );
      validateSaleField(
        "exchange.purchaseRate",
        data.get("exchange.purchaseRate"),
        nonNegativeAmount,
      );
      validateSaleField(
        "exchange.ownerShipSerialNo",
        data.get("exchange.ownerShipSerialNo"),
        requiredText,
      );
      exchangeExpenses.forEach((_, index) => {
        validateSaleField(
          `exchangeExpenses.${index}.date`,
          data.get(`exchangeExpenses.${index}.date`),
          requiredText,
          "exchangeExpenses.date",
        );
        validateSaleField(
          `exchangeExpenses.${index}.typeId`,
          data.get(`exchangeExpenses.${index}.typeId`),
          requiredSelection,
          "exchangeExpenses.typeId",
        );
        validateSaleField(
          `exchangeExpenses.${index}.description`,
          data.get(`exchangeExpenses.${index}.description`),
          requiredText,
          "exchangeExpenses.description",
        );
        validateSaleField(
          `exchangeExpenses.${index}.amount`,
          data.get(`exchangeExpenses.${index}.amount`),
          positiveAmount,
          "exchangeExpenses.amount",
        );
        validateSaleField(
          `exchangeExpenses.${index}.paymentAccountId`,
          data.get(`exchangeExpenses.${index}.paymentAccountId`),
          requiredSelection,
          "exchangeExpenses.paymentAccountId",
        );
      });

      const totalsByAccount: Record<number, number> = {};
      exchangeExpenses.forEach((_, index) => {
        const accountId = numberValue(
          data.get(`exchangeExpenses.${index}.paymentAccountId`),
        );
        const amount = numberValue(
          data.get(`exchangeExpenses.${index}.amount`),
        );
        if (accountId < 1 || amount <= 0) return;

        const balance = paymentAccountBalance(accounts.data, accountId);
        if (balance != null && amount > balance) {
          nextErrors[`exchangeExpenses.${index}.amount`] =
            `Payment amount cannot exceed account balance (${formatCurrency(balance)})`;
        }
        totalsByAccount[accountId] = (totalsByAccount[accountId] ?? 0) + amount;
      });

      for (const [accountIdValue, total] of Object.entries(totalsByAccount)) {
        const accountId = Number(accountIdValue);
        const balance = paymentAccountBalance(accounts.data, accountId);
        if (balance == null || total <= balance) continue;

        exchangeExpenses.forEach((_, index) => {
          if (
            numberValue(
              data.get(`exchangeExpenses.${index}.paymentAccountId`),
            ) === accountId
          ) {
            nextErrors[`exchangeExpenses.${index}.amount`] =
              `Total expenses for this account (${formatCurrency(total)}) cannot exceed account balance (${formatCurrency(balance)})`;
          }
        });
      }
    }
    if (financed) {
      validateSaleField(
        "financeCompany",
        data.get("financeCompany"),
        requiredText,
      );
      validateSaleField(
        "financeAmount",
        data.get("financeAmount"),
        nonNegativeAmount,
      );
      validateSaleField("emiAmount", data.get("emiAmount"), nonNegativeAmount);
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const amountSplits = splits.map((split, index) => ({
      id: split.id,
      typeId: numberValue(data.get(`splits.${index}.typeId`)),
      amount: numberValue(data.get(`splits.${index}.amount`)),
    }));
    const expenses = exchangeExpenses.map((expense, index) => ({
      id: expense.id,
      ...(expense.version != null && { version: expense.version }),
      date: String(data.get(`exchangeExpenses.${index}.date`)),
      typeId: numberValue(data.get(`exchangeExpenses.${index}.typeId`)),
      description: String(data.get(`exchangeExpenses.${index}.description`)),
      amount: numberValue(data.get(`exchangeExpenses.${index}.amount`)),
      paymentAccountId: numberValue(
        data.get(`exchangeExpenses.${index}.paymentAccountId`),
      ),
    }));
    const value: SaleInput = {
      date: String(data.get("date")),
      stockId: numberValue(data.get("stockId")),
      saleRate: numberValue(data.get("saleRate")),
      customerName: String(data.get("customerName")),
      customerMobileNo: String(data.get("customerMobileNo")),
      customerAddress: String(data.get("customerAddress")),
      paymentStatus: sale?.paymentStatus ?? "PENDING",
      isExchanged: exchanged,
      exchangeAmount: exchanged
        ? numberValue(data.get("exchangeAmount"))
        : null,
      exchangeVehicleDetails: exchanged
        ? {
            ...(exchangeVehicle?.id != null && { id: exchangeVehicle.id }),
            ...(exchangeVehicle?.version != null && {
              version: exchangeVehicle.version,
            }),
            vehicleNo: String(data.get("exchange.vehicleNo")),
            brandId: numberValue(data.get("exchange.brandId")),
            modelId: numberValue(data.get("exchange.modelId")),
            variantId: numberValue(data.get("exchange.variantId")),
            colorId: numberValue(data.get("exchange.colorId")),
            fuelTypeId: numberValue(data.get("exchange.fuelTypeId")),
            transmissionTypeId: numberValue(
              data.get("exchange.transmissionTypeId"),
            ),
            segmentId: numberValue(data.get("exchange.segmentId")),
            warehouseId: numberValue(data.get("exchange.warehouseId")),
            makeYear: String(data.get("exchange.makeYear")),
            odometer: String(data.get("exchange.odometer")),
            purchaseRate: numberValue(data.get("exchange.purchaseRate")),
            ownerShipSerialNo: String(data.get("exchange.ownerShipSerialNo")),
            expenses,
          }
        : null,
      isFinanced: financed,
      financeCompany: financed
        ? optionalText(data.get("financeCompany"))
        : null,
      financeAmount: financed ? numberValue(data.get("financeAmount")) : null,
      emiAmount: financed ? numberValue(data.get("emiAmount")) : null,
      amountSplits,
    };
    mutation.mutate(value);
  };
  const lookup = (type: string): Lookup[] =>
    (lookups.data as Record<string, Lookup[]> | undefined)?.[type] ?? [];
  const exchangeSelect = (
    field: string,
    type: string,
    label: string,
    defaultValue?: number | null,
  ) => (
    <FormField label={label} required error={errors[`exchange.${field}`]}>
      <Select
        key={`${field}-${lookups.isSuccess ? "ready" : "loading"}`}
        name={`exchange.${field}`}
        required
        defaultValue={defaultValue ? String(defaultValue) : ""}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {lookup(type).map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
    </FormField>
  );
  const editStockId =
    sale?.stockId ??
    products.data?.find(
      (item) =>
        item.code === sale?.vehicleNo || item.description === sale?.vehicleNo,
    )?.id ??
    0;
  const saleProductDescription = sale
    ? [sale.brandName, sale.modelName, sale.variantName]
        .filter(Boolean)
        .join(" ")
    : "";
  return (
    <form className="operations-form" noValidate onSubmit={submit}>
      <Section title={sale ? undefined : "Sale and customer"}>
        {sale && (
          <>
            <input type="hidden" name="stockId" value={editStockId} readOnly />
            <div className="operations-vehicle-card">
              <strong>{sale.vehicleNo || "—"}</strong>
              <span>{saleProductDescription || "—"}</span>
            </div>
            {errors.stockId && (
              <p className="operations-section-error" role="alert">
                {errors.stockId}
              </p>
            )}
          </>
        )}
        <div className="operations-form-grid">
          <FormField label="Sale date" required error={errors.date}>
            <DateInput
              name="date"
              required
              defaultValue={sale?.date ?? today()}
            />
          </FormField>
          {!sale && (
            <FormField label="Stock vehicle" required error={errors.stockId}>
              <Select name="stockId" required>
                <option value="">Select vehicle</option>
                {products.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.description}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Sale rate" required error={errors.saleRate}>
            <Input
              name="saleRate"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={sale?.saleRate}
            />
          </FormField>
          <FormField label="Customer name" required error={errors.customerName}>
            <Input
              name="customerName"
              required
              defaultValue={sale?.customerName ?? ""}
            />
          </FormField>
          <FormField
            label="Customer mobile"
            required
            error={errors.customerMobileNo}
          >
            <Input
              name="customerMobileNo"
              type="tel"
              required
              defaultValue={sale?.customerMobileNo ?? ""}
            />
          </FormField>
          <FormField
            label="Customer address"
            required
            error={errors.customerAddress}
          >
            <Input
              name="customerAddress"
              required
              defaultValue={sale?.customerAddress ?? ""}
            />
          </FormField>
        </div>
      </Section>
      <Section
        title="Amount splits"
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setSplits((items) => [...items, { typeId: 0, amount: 0 }])
            }
          >
            <Plus /> Add split
          </Button>
        }
      >
        {splits.map((split, index) => (
          <fieldset
            className="operations-repeat-row"
            key={`${split.id ?? "new"}-${index}`}
          >
            <legend>Split {index + 1}</legend>
            <FormField
              label="Type"
              required
              error={errors[`splits.${index}.typeId`]}
            >
              <Select
                name={`splits.${index}.typeId`}
                required
                defaultValue={split.typeId || ""}
              >
                <option value="">Select type</option>
                {lookup("SALE_SPLIT_TYPE").map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Amount"
              required
              error={errors[`splits.${index}.amount`]}
            >
              <Input
                name={`splits.${index}.amount`}
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={split.amount}
              />
            </FormField>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove split ${index + 1}`}
              onClick={() =>
                setSplits((items) => items.filter((_, row) => row !== index))
              }
            >
              <Trash2 />
            </Button>
          </fieldset>
        ))}
      </Section>
      <Section title="Exchange">
        <label className="operations-toggle">
          <input
            type="checkbox"
            checked={exchanged}
            onChange={(event) => setExchanged(event.target.checked)}
          />{" "}
          Includes exchange vehicle
        </label>
        {exchanged && (
          <>
            <div className="operations-form-grid">
              <FormField
                label="Exchange amount"
                required
                error={errors.exchangeAmount}
              >
                <Input
                  name="exchangeAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={exchangeAmount}
                  onChange={(event) => setExchangeAmount(event.target.value)}
                />
              </FormField>
              <FormField
                label="Vehicle number"
                required
                error={errors["exchange.vehicleNo"]}
              >
                <Input
                  name="exchange.vehicleNo"
                  required
                  defaultValue={exchangeVehicle?.vehicleNo ?? ""}
                />
              </FormField>
              <FormField
                label="Brand"
                required
                error={errors["exchange.brandId"]}
              >
                <Select
                  name="exchange.brandId"
                  required
                  value={exchangeBrandId || ""}
                  onChange={(event) => {
                    setExchangeBrandId(Number(event.target.value));
                    setExchangeModelId(0);
                  }}
                >
                  <option value="">Select brand</option>
                  {lookup("BRAND").map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Model"
                required
                error={errors["exchange.modelId"]}
              >
                <Select
                  name="exchange.modelId"
                  required
                  value={exchangeModelId || ""}
                  onChange={(event) =>
                    setExchangeModelId(Number(event.target.value))
                  }
                >
                  <option value="">Select model</option>
                  {exchangeModels.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Variant"
                required
                error={errors["exchange.variantId"]}
              >
                <Select
                  key={`exchange-variant-${exchangeVariants.isSuccess ? "ready" : "loading"}`}
                  name="exchange.variantId"
                  required
                  defaultValue={
                    exchangeVehicle?.variantId
                      ? String(exchangeVehicle.variantId)
                      : ""
                  }
                >
                  <option value="">Select variant</option>
                  {exchangeVariants.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              {exchangeSelect(
                "colorId",
                "COLOR",
                "Color",
                exchangeVehicle?.colorId,
              )}
              {exchangeSelect(
                "fuelTypeId",
                "FUEL_TYPE",
                "Fuel type",
                exchangeVehicle?.fuelTypeId,
              )}
              {exchangeSelect(
                "transmissionTypeId",
                "TRANSMISSION_TYPE",
                "Transmission type",
                exchangeVehicle?.transmissionTypeId,
              )}
              {exchangeSelect(
                "segmentId",
                "SEGMENT",
                "Segment",
                exchangeVehicle?.segmentId,
              )}
              <FormField
                label="Warehouse"
                required
                error={errors["exchange.warehouseId"]}
              >
                <Select
                  name="exchange.warehouseId"
                  required
                  defaultValue={String(exchangeVehicle?.warehouseId ?? 1)}
                >
                  <option value="1">Future Cars</option>
                </Select>
              </FormField>
              <FormField
                label="Make year"
                required
                error={errors["exchange.makeYear"]}
              >
                <Input
                  name="exchange.makeYear"
                  type="number"
                  required
                  defaultValue={exchangeVehicle?.makeYear ?? ""}
                />
              </FormField>
              <FormField
                label="Odometer"
                required
                error={errors["exchange.odometer"]}
              >
                <Input
                  name="exchange.odometer"
                  type="number"
                  min="0"
                  required
                  defaultValue={exchangeVehicle?.odometer ?? ""}
                />
              </FormField>
              <FormField
                label="Purchase rate"
                required
                error={errors["exchange.purchaseRate"]}
              >
                <Input
                  name="exchange.purchaseRate"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={exchangeAmount}
                  readOnly
                />
              </FormField>
              <FormField
                label="Ownership serial"
                required
                error={errors["exchange.ownerShipSerialNo"]}
              >
                <Input
                  name="exchange.ownerShipSerialNo"
                  required
                  defaultValue={exchangeVehicle?.ownerShipSerialNo ?? ""}
                />
              </FormField>
            </div>
            <div className="operations-subsection-header">
              <h3>Exchange expenses</h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setExchangeExpenses((items) => [
                    ...items,
                    {
                      date: today(),
                      typeId: 0,
                      description: "",
                      amount: 0,
                      paymentAccountId: 0,
                    },
                  ])
                }
              >
                <Plus /> Add
              </Button>
            </div>
            {exchangeExpenses.map((expense, index) => {
              const selectedBalance = paymentAccountBalance(
                accounts.data,
                expense.paymentAccountId,
              );
              return (
                <fieldset className="operations-repeat-row" key={index}>
                  <legend>Expense {index + 1}</legend>
                  <FormField
                    label="Date"
                    required
                    error={errors[`exchangeExpenses.${index}.date`]}
                  >
                    <DateInput
                      name={`exchangeExpenses.${index}.date`}
                      required
                      defaultValue={expense.date}
                    />
                  </FormField>
                  <FormField
                    label="Type"
                    required
                    error={errors[`exchangeExpenses.${index}.typeId`]}
                  >
                    <Select
                      name={`exchangeExpenses.${index}.typeId`}
                      required
                      defaultValue={expense.typeId ? String(expense.typeId) : ""}
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
                    error={errors[`exchangeExpenses.${index}.description`]}
                  >
                    <Input
                      name={`exchangeExpenses.${index}.description`}
                      required
                      defaultValue={expense.description}
                    />
                  </FormField>
                  <FormField
                    label="Amount"
                    required
                    error={errors[`exchangeExpenses.${index}.amount`]}
                  >
                    <Input
                      name={`exchangeExpenses.${index}.amount`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      defaultValue={expense.amount || ""}
                    />
                  </FormField>
                  <FormField
                    label="Payment account"
                    required
                    error={
                      errors[`exchangeExpenses.${index}.paymentAccountId`]
                    }
                    hint={
                      expense.paymentAccountId > 0 && selectedBalance != null
                        ? `Available balance: ${formatCurrency(selectedBalance)}`
                        : undefined
                    }
                  >
                    <Select
                      key={`exchange-expense-account-${index}-${accounts.isSuccess ? "ready" : "loading"}`}
                      name={`exchangeExpenses.${index}.paymentAccountId`}
                      required
                      value={
                        expense.paymentAccountId
                          ? String(expense.paymentAccountId)
                          : ""
                      }
                      onChange={(event) => {
                        const paymentAccountId = Number(event.target.value) || 0;
                        setExchangeExpenses((items) =>
                          items.map((item, row) =>
                            row === index
                              ? { ...item, paymentAccountId }
                              : item,
                          ),
                        );
                      }}
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
                    onClick={() =>
                      setExchangeExpenses((items) =>
                        items.filter((_, row) => row !== index),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </fieldset>
              );
            })}
          </>
        )}
      </Section>
      <Section title="Financing">
        <label className="operations-toggle">
          <input
            type="checkbox"
            checked={financed}
            onChange={(event) => setFinanced(event.target.checked)}
          />{" "}
          Financed sale
        </label>
        {financed && (
          <div className="operations-form-grid">
            <FormField
              label="Finance company"
              required
              error={errors.financeCompany}
            >
              <Input
                name="financeCompany"
                required
                defaultValue={sale?.financeCompany ?? ""}
              />
            </FormField>
            <FormField
              label="Finance amount"
              required
              error={errors.financeAmount}
            >
              <Input
                name="financeAmount"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={sale?.financeAmount ?? ""}
              />
            </FormField>
            <FormField label="EMI amount" required error={errors.emiAmount}>
              <Input
                name="emiAmount"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={sale?.emiAmount ?? ""}
              />
            </FormField>
          </div>
        )}
      </Section>
      <FormActions
        cancelTo={sale ? `${SALES}/${sale.id}` : SALES}
        pending={mutation.isPending}
        label={sale ? "Update sale" : "Create sale"}
      />
    </form>
  );
};

export const SaleCreateRoute = () => (
  <RouteFormPage
    title="New sale"
    description="Record customer, stock, exchange and finance terms."
  >
    <SaleEditor />
  </RouteFormPage>
);
export const SaleEditRoute = () => {
  const id = useNumericParam("saleId");
  const query = useQuery({
    queryKey: ["operations", "sale", id],
    queryFn: () => operationsApi.sales.detail(id!),
    enabled: !!id,
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage title="Edit sale">
      <QueryBoundary pending={query.isPending} error={query.error}>
        {query.data && <SaleEditor sale={query.data} />}
      </QueryBoundary>
    </RouteFormPage>
  );
};

export const SaleDetailRoute = () => {
  const id = useNumericParam("saleId");
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const query = useQuery({
    queryKey: ["operations", "sale", id],
    queryFn: () => operationsApi.sales.detail(id!),
    enabled: !!id,
  });
  const deletion = useMutation({
    mutationFn: () => operationsApi.sales.delete(id!),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["operations", "sales"] });
      void client.invalidateQueries({ queryKey: ["operations", "stock"] });
      void client.invalidateQueries({ queryKey: ["operations", "stock-detail"] });
      void client.invalidateQueries({
        queryKey: ["operations", "stock-products"],
      });
      toast.success("Sale deleted");
      navigate(SALES);
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  const sale = query.data;
  return (
    <>
      <PageHeader
        title={sale?.vehicleNo ?? "Sale"}
        description={
          sale
            ? `${sale.brandName} ${sale.modelName} ${sale.variantName}`
            : undefined
        }
        actions={
          sale && (
            <>
              <AuditHistoryButton
                entityType="sale"
                entityId={id}
                recordLabel={sale.vehicleNo}
              />
              {(sale.pendingAmount ?? 0) > 0 && (
                <Can resource="SALE" privilege="CREATE">
                  <Link
                    className="button button--secondary"
                    to={`${SALES}/${id}/payment`}
                  >
                    Record payment
                  </Link>
                </Can>
              )}
              <Can resource="SALE" privilege="UPDATE">
                <Link
                  className="button button--secondary"
                  to={`${SALES}/${id}/edit`}
                >
                  Edit
                </Link>
              </Can>
              {sale.paymentStatus === "PENDING" && !sale.exchange ? (
                <Can resource="SALE" privilege="DELETE">
                  <Button variant="danger" onClick={() => setConfirm(true)}>
                    Delete
                  </Button>
                </Can>
              ) : (
                <Can resource="SALE_RETURN" privilege="CREATE">
                  <Link
                    className="button button--secondary"
                    to={`${SALES}/${id}/return`}
                  >
                    Create return
                  </Link>
                </Can>
              )}
            </>
          )
        }
      />
      <QueryBoundary pending={query.isPending} error={query.error}>
        {sale && (
          <>
            <Section title="Sale details">
              <DetailGrid>
                <Detail label="Date" value={formatDate(sale.date)} />
                <Detail label="Customer" value={sale.customerName} />
                <Detail label="Mobile" value={sale.customerMobileNo} />
                <Detail label="Address" value={sale.customerAddress} />
                <Detail
                  label="Sale rate"
                  value={<Money value={sale.saleRate} />}
                />
                <Detail label="Profit" value={<Money value={sale.profit} />} />
                <Detail label="Exchange" value={sale.exchange ? "Yes" : "No"} />
                <Detail
                  label="Exchange amount"
                  value={<Money value={sale.exchangeAmount} />}
                />
                <Detail label="Financed" value={sale.financed ? "Yes" : "No"} />
                <Detail label="Finance company" value={sale.financeCompany} />
                <Detail
                  label="Finance amount"
                  value={<Money value={sale.financeAmount} />}
                />
                <Detail label="EMI" value={<Money value={sale.emiAmount} />} />
                <Detail
                  label="Customer pending"
                  value={<Money value={sale.pendingCustomerAmount} />}
                />
                <Detail
                  label="Finance pending"
                  value={<Money value={sale.pendingFinanceAmount} />}
                />
                <Detail label="Payment status" value={sale.paymentStatus} />
              </DetailGrid>
            </Section>
            <Section title="Amount splits">
              <DataTable
                caption="Sale amount splits"
                rows={sale.amountSplits ?? []}
                rowKey={(row) => String(row.id)}
                columns={[
                  {
                    key: "type",
                    header: "Type",
                    cell: (row) => row.typeDesc ?? String(row.typeId),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    align: "right",
                    cell: (row) => formatCurrency(row.amount),
                  },
                ]}
              />
            </Section>
            <Section title="Payments">
              <DataTable
                caption="Sale payments"
                rows={sale.payments ?? []}
                rowKey={(row) => String(row.id)}
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    cell: (row) => formatDate(row.paymentDate),
                  },
                  {
                    key: "payer",
                    header: "Payer",
                    cell: (row) => row.payerType ?? "CUSTOMER",
                  },
                  {
                    key: "method",
                    header: "Method",
                    cell: (row) => row.paymentMethod ?? "—",
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
                          entityType="sale-payment"
                          entityId={row.id}
                          variant="ghost"
                        />
                        <Link to={`${SALES}/${id}/payments/${row.id}/edit`}>
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
      <ConfirmDialog
        open={confirm}
        title="Delete sale?"
        message="This permanently deletes the sale where accounting rules allow it."
        danger
        loading={deletion.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => deletion.mutate()}
      />
    </>
  );
};

export const SalePaymentRoute = () => {
  const id = useNumericParam("saleId");
  const paymentId = useNumericParam("paymentId");
  const client = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["operations", "sale", id],
    queryFn: () => operationsApi.sales.detail(id!),
    enabled: !!id,
  });
  const payment = query.data?.payments?.find((item) => item.id === paymentId);
  const [payer, setPayer] = useState<PayerType>(
    payment?.payerType ??
      (query.data?.financed && (query.data.pendingFinanceAmount ?? 0) > 0
        ? "FINANCE"
        : "CUSTOMER"),
  );
  const maximum =
    payer === "FINANCE"
      ? query.data?.pendingFinanceAmount
      : query.data?.pendingCustomerAmount;
  useEffect(() => {
    if (!query.data) return;
    if (!query.data.financed) {
      setPayer("CUSTOMER");
    } else if (payment?.payerType) {
      setPayer(payment.payerType);
    } else if (!paymentId) {
      setPayer(
        (query.data.pendingFinanceAmount ?? 0) > 0 ? "FINANCE" : "CUSTOMER",
      );
    }
  }, [payment?.payerType, paymentId, query.data]);
  const mutation = useMutation({
    mutationFn: (value: PaymentInput) =>
      paymentId
        ? operationsApi.sales.updatePayment(id!, paymentId, {
            ...value,
            payerType: payer,
            version: payment?.version ?? 0,
          })
        : operationsApi.sales.payment(id!, { ...value, payerType: payer }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["operations", "sale", id] });
      void client.invalidateQueries({ queryKey: ["operations", "sales"] });
      toast.success(paymentId ? "Payment updated" : "Payment recorded");
      navigate(`${SALES}/${id}`);
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage
      title={paymentId ? "Edit sale payment" : "Record sale payment"}
    >
      <QueryBoundary pending={query.isPending} error={query.error}>
        <fieldset className="operations-radio-group">
          <legend>Payer</legend>
          <label>
            <input
              type="radio"
              name="payer"
              value="CUSTOMER"
              checked={payer === "CUSTOMER"}
              onChange={() => setPayer("CUSTOMER")}
            />
            Customer
          </label>
          <label className={!query.data?.financed ? "is-disabled" : undefined}>
            <input
              type="radio"
              name="payer"
              value="FINANCE"
              checked={payer === "FINANCE"}
              disabled={!query.data?.financed}
              onChange={() => setPayer("FINANCE")}
            />
            Finance company
          </label>
        </fieldset>
        {paymentId && !payment ? (
          <InvalidRoute />
        ) : (
          <PaymentForm
            key={`${paymentId ?? "new"}-${payer}-${maximum ?? 0}`}
            payment={payment}
            payer={payer}
            defaultAmount={paymentId ? undefined : (maximum ?? undefined)}
            maximum={paymentId ? undefined : (maximum ?? undefined)}
            pending={mutation.isPending}
            cancelTo={`${SALES}/${id}`}
            submitLabel={paymentId ? "Update payment" : "Record payment"}
            onSubmit={(value) => mutation.mutate(value)}
          />
        )}
      </QueryBoundary>
    </RouteFormPage>
  );
};

export const SaleReturnsListRoute = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchInput>({});
  const query = useQuery({
    queryKey: ["operations", "sale-returns", page, filters],
    queryFn: () => operationsApi.saleReturns.list(page - 1, 20, filters),
  });
  const rows = query.data?.saleReturns ?? [];
  return (
    <>
      <PageHeader
        title="Sales returns"
        description="Returned sales and customer refunds."
      />
      <SearchFilters query="" collapsible onQueryChange={() => undefined}>
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
        <Select
          aria-label="Status"
          value={filters.status ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, status: event.target.value })
          }
          options={[
            { value: "", label: "All statuses" },
            ...["PENDING", "PARTIAL", "COMPLETED"].map((value) => ({
              value,
              label: value,
            })),
          ]}
        />
      </SearchFilters>
      <QueryBoundary pending={query.isPending} error={query.error}>
        <DataTable
          caption="Sale returns"
          rows={rows}
          rowKey={(row) => String(row.id)}
          onRowClick={(row) => navigate(`${RETURNS}/${row.id}`)}
          columns={[
            {
              key: "invoice",
              header: "Invoice",
              cell: (row) => <strong>{row.invoiceNo}</strong>,
            },
            {
              key: "date",
              header: "Date",
              cell: (row) => formatDate(row.returnDate),
            },
            { key: "reason", header: "Reason", cell: (row) => row.reason },
            {
              key: "refund",
              header: "Refund",
              align: "right",
              cell: (row) => formatCurrency(row.refundAmount),
            },
            {
              key: "remaining",
              header: "Remaining",
              align: "right",
              cell: (row) => formatCurrency(row.remainingRefund),
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

export const SaleReturnDetailRoute = () => {
  const id = useNumericParam("returnId");
  const [deleteId, setDeleteId] = useState<number>();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["operations", "sale-return", id],
    queryFn: () => operationsApi.saleReturns.detail(id!),
    enabled: !!id,
  });
  const deletion = useMutation({
    mutationFn: () => operationsApi.saleReturns.deleteRefund(id!, deleteId!),
    onSuccess: () => {
      setDeleteId(undefined);
      void client.invalidateQueries({
        queryKey: ["operations", "sale-return", id],
      });
      toast.success("Refund deleted");
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  const item = query.data;
  return (
    <>
      <PageHeader
        title={item?.invoiceNo ?? "Sale return"}
        actions={
          item && (
            <>
              <AuditHistoryButton
                entityType="sale-return"
                entityId={id}
                recordLabel={item.invoiceNo}
              />
              {item.status !== "COMPLETED" && item.remainingRefund > 0 && (
                <Link
                  className="button button--primary"
                  to={`${RETURNS}/${id}/refund`}
                >
                  Record refund
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
                <Detail label="Date" value={formatDate(item.returnDate)} />
                <Detail label="Reason" value={item.reason} />
                <Detail label="Notes" value={item.notes} />
                <Detail
                  label="Customer paid"
                  value={<Money value={item.customerPaidAmount} />}
                />
                <Detail
                  label="Exchange handling"
                  value={item.exchangeHandling.replaceAll("_", " ")}
                />
                <Detail
                  label="Exchange buyback"
                  value={<Money value={item.exchangeBuybackAmount} />}
                />
                <Detail
                  label="Sold vehicle deductions"
                  value={<Money value={item.soldVehicleDeductionAmount} />}
                />
                <Detail
                  label="Exchange deductions"
                  value={<Money value={item.exchangeVehicleDeductionAmount} />}
                />
                <Detail
                  label="Refund due"
                  value={<Money value={item.refundAmount} />}
                />
                <Detail
                  label="Refunded"
                  value={<Money value={item.totalRefunded} />}
                />
                <Detail
                  label="Remaining"
                  value={<Money value={item.remainingRefund} />}
                />
                <Detail label="Status" value={item.status} />
              </DetailGrid>
            </Section>
            <Section title="Deductions">
              <DataTable
                caption="Return deductions"
                rows={item.deductions ?? []}
                rowKey={(row) => String(row.id)}
                columns={[
                  {
                    key: "context",
                    header: "Vehicle",
                    cell: (row) => row.vehicleContext,
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
                    key: "history",
                    header: "",
                    cell: (row) => (
                      <AuditHistoryButton
                        entityType="sale-return-deduction"
                        entityId={row.id}
                        variant="ghost"
                      />
                    ),
                  },
                ]}
              />
            </Section>
            <Section title="Refunds">
              <DataTable
                caption="Return refunds"
                rows={item.refunds ?? []}
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
                    key: "actions",
                    header: "",
                    cell: (row) => (
                      <span className="operations-inline-actions">
                        <AuditHistoryButton
                          entityType="sale-refund-payment"
                          entityId={row.id}
                          variant="ghost"
                        />
                        <Can resource="SALE_RETURN" privilege="UPDATE">
                          <Link to={`${RETURNS}/${id}/refunds/${row.id}/edit`}>
                            Edit
                          </Link>
                        </Can>
                        <Can resource="SALE_RETURN" privilege="DELETE">
                          <Button
                            variant="ghost"
                            onClick={() => setDeleteId(row.id)}
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
      </QueryBoundary>
      <ConfirmDialog
        open={deleteId !== undefined}
        title="Delete refund?"
        message="The refund and its accounting transaction will be reversed."
        danger
        loading={deletion.isPending}
        onClose={() => setDeleteId(undefined)}
        onConfirm={() => deletion.mutate()}
      />
    </>
  );
};

const DeductionRows = ({
  prefix,
  rows,
  errors,
  onChange,
}: {
  prefix: string;
  rows: Deduction[];
  errors: FieldErrors;
  onChange: (rows: Deduction[]) => void;
}) => (
  <>
    {rows.map((row, index) => (
      <fieldset className="operations-repeat-row" key={index}>
        <legend>Deduction {index + 1}</legend>
        <input
          type="hidden"
          name={`${prefix}.${index}.expenseId`}
          value={row.expenseId ?? ""}
        />
        <FormField
          label="Description"
          required
          error={errors[`${prefix}.${index}.description`]}
        >
          <Input
            name={`${prefix}.${index}.description`}
            required
            value={row.description}
            onChange={(event) =>
              onChange(
                rows.map((item, rowIndex) =>
                  rowIndex === index
                    ? { ...item, description: event.target.value }
                    : item,
                ),
              )
            }
          />
        </FormField>
        <FormField
          label="Amount"
          required
          error={errors[`${prefix}.${index}.amount`]}
        >
          <Input
            name={`${prefix}.${index}.amount`}
            type="number"
            min="0"
            step="0.01"
            required
            value={row.amount}
            onChange={(event) =>
              onChange(
                rows.map((item, rowIndex) =>
                  rowIndex === index
                    ? { ...item, amount: Number(event.target.value) || 0 }
                    : item,
                ),
              )
            }
          />
        </FormField>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            onChange(rows.filter((_, rowIndex) => rowIndex !== index))
          }
        >
          <Trash2 />
        </Button>
      </fieldset>
    ))}
  </>
);

export const SaleReturnCreateRoute = () => {
  const saleId = useNumericParam("saleId");
  const navigate = useNavigate();
  const client = useQueryClient();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [handling, setHandling] = useState<ExchangeHandling>();
  const [buybackAmount, setBuybackAmount] = useState<string>();
  const [sold, setSold] = useState<Deduction[]>([]);
  const [exchange, setExchange] = useState<Deduction[]>([]);
  const query = useQuery({
    queryKey: ["operations", "sale-return-form", saleId],
    queryFn: () => operationsApi.saleReturns.formData(saleId!),
    enabled: !!saleId,
  });
  const mutation = useMutation({
    mutationFn: (
      value: Parameters<typeof operationsApi.saleReturns.create>[1],
    ) => operationsApi.saleReturns.create(saleId!, value),
    onSuccess: (response) => {
      void client.invalidateQueries({ queryKey: ["operations", "sales"] });
      void client.invalidateQueries({
        queryKey: ["operations", "sale-returns"],
      });
      void client.invalidateQueries({ queryKey: ["operations", "stock"] });
      void client.invalidateQueries({ queryKey: ["operations", "stock-detail"] });
      void client.invalidateQueries({
        queryKey: ["operations", "stock-products"],
      });
      toast.success("Sale return created");
      navigate(`${RETURNS}/${response.saleReturnId ?? response.id}`);
    },
    onError: (error) =>
      applyServerErrors(error, setErrors, "saleReturn", returnServerField),
  });
  if (!saleId) return <InvalidRoute />;
  const hasExchange = !!query.data?.exchangeVehicle;
  const selectedHandling: ExchangeHandling = hasExchange
    ? (handling ?? "KEEP_AND_BUYBACK")
    : "NONE";
  const originalExchangeAmount =
    query.data?.exchangeVehicle?.originalExchangeAmount ?? 0;
  const displayedBuybackAmount =
    buybackAmount ?? (hasExchange ? String(originalExchangeAmount) : "");
  const parsedBuybackAmount =
    selectedHandling === "KEEP_AND_BUYBACK"
      ? Number(displayedBuybackAmount) || 0
      : 0;
  const soldDeductionsTotal = sold.reduce(
    (total, deduction) => total + deduction.amount,
    0,
  );
  const exchangeDeductionsTotal =
    selectedHandling === "KEEP_AND_BUYBACK"
      ? exchange.reduce((total, deduction) => total + deduction.amount, 0)
      : 0;
  const computedRefund =
    (query.data?.customerPaidAmount ?? 0) +
    parsedBuybackAmount -
    soldDeductionsTotal -
    exchangeDeductionsTotal;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors: FieldErrors = {};
    const validateReturnField = (
      field: string,
      value: FormDataEntryValue | null,
      schema: z.ZodType<string>,
      configField = field,
    ) =>
      validateField(
        nextErrors,
        "saleReturn",
        field,
        value,
        schema,
        configField,
      );
    validateReturnField("returnDate", data.get("returnDate"), requiredText);
    if (hasExchange) {
      validateReturnField("exchangeHandling", selectedHandling, requiredText);
    }
    if (selectedHandling === "KEEP_AND_BUYBACK") {
      validateReturnField(
        "exchangeBuybackAmount",
        data.get("exchangeBuybackAmount"),
        positiveAmount,
      );
      if (parsedBuybackAmount > originalExchangeAmount) {
        nextErrors.exchangeBuybackAmount = `Buyback cannot exceed the original exchange value of ${formatCurrency(originalExchangeAmount)}`;
      }
    }
    const validateDeductions = (prefix: string, rows: Deduction[]) => {
      rows.forEach((_, index) => {
        validateReturnField(
          `${prefix}.${index}.description`,
          data.get(`${prefix}.${index}.description`),
          requiredText,
          "deductions.description",
        );
        validateReturnField(
          `${prefix}.${index}.amount`,
          data.get(`${prefix}.${index}.amount`),
          nonNegativeAmount,
          "deductions.amount",
        );
      });
    };
    validateDeductions("sold", sold);
    if (selectedHandling === "KEEP_AND_BUYBACK") {
      validateDeductions("exchange", exchange);
    }
    if (computedRefund < 0) {
      nextErrors.refundAmount =
        "Deductions exceed what the customer is owed. Reduce deductions.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const read = (prefix: string, rows: Deduction[]) =>
      rows.map((row, index) => ({
        expenseId: row.expenseId,
        description: String(data.get(`${prefix}.${index}.description`)),
        amount: numberValue(data.get(`${prefix}.${index}.amount`)),
      }));
    mutation.mutate({
      returnDate: String(data.get("returnDate")),
      reason: optionalText(data.get("reason")),
      notes: optionalText(data.get("notes")),
      exchangeHandling: selectedHandling,
      exchangeBuybackAmount:
        selectedHandling === "KEEP_AND_BUYBACK" ? parsedBuybackAmount : null,
      soldVehicleDeductions: read("sold", sold),
      exchangeVehicleDeductions:
        selectedHandling === "KEEP_AND_BUYBACK"
          ? read("exchange", exchange)
          : [],
    });
  };
  if (query.data?.isFinanced) {
    return (
      <RouteFormPage title="Create sale return">
        <Section title="Return not available">
          <p className="operations-warning">
            Financed sales cannot be returned through this flow.
          </p>
          <Link className="button button--secondary" to={`${SALES}/${saleId}`}>
            Go back
          </Link>
        </Section>
      </RouteFormPage>
    );
  }
  return (
    <RouteFormPage title="Create sale return">
      <QueryBoundary pending={query.isPending} error={query.error}>
        {query.data && (
          <form className="operations-form" noValidate onSubmit={submit}>
            {query.data.customerPaidAmount === 0 && (
              <p className="operations-warning">
                This sale has no recorded customer payments. No cash refund will
                be due.
              </p>
            )}
            <Section title="Sale summary">
              <DetailGrid>
                <Detail label="Invoice" value={query.data.invoiceNo} />
                <Detail
                  label="Sale date"
                  value={formatDate(query.data.saleDate)}
                />
                <Detail
                  label="Sale rate"
                  value={<Money value={query.data.saleRate} />}
                />
                <Detail
                  label="Customer paid"
                  value={<Money value={query.data.customerPaidAmount} />}
                />
              </DetailGrid>
            </Section>
            <Section title="Return">
              <div className="operations-form-grid">
                <FormField
                  label="Return date"
                  required
                  error={errors.returnDate}
                >
                  <DateInput
                    name="returnDate"
                    required
                    defaultValue={today()}
                  />
                </FormField>
                <FormField label="Reason" error={errors.reason}>
                  <Textarea name="reason" />
                </FormField>
                <FormField label="Notes" error={errors.notes}>
                  <Textarea name="notes" />
                </FormField>
              </div>
            </Section>
            {query.data.exchangeVehicle && (
              <Section title="Exchange handling">
                <div
                  className="operations-choice-cards"
                  role="radiogroup"
                  aria-label="Exchange handling"
                >
                  <label
                    className={
                      selectedHandling === "KEEP_AND_BUYBACK"
                        ? "operations-choice-card is-selected"
                        : "operations-choice-card"
                    }
                  >
                    <input
                      type="radio"
                      name="exchangeHandling"
                      value="KEEP_AND_BUYBACK"
                      checked={selectedHandling === "KEEP_AND_BUYBACK"}
                      onChange={() => setHandling("KEEP_AND_BUYBACK")}
                    />
                    <span>
                      <strong>Keep</strong>
                      <small>
                        Keep the exchange vehicle and buy it back from the
                        customer
                      </small>
                    </span>
                  </label>
                  <label
                    className={
                      selectedHandling === "RETURN_TO_BUYER"
                        ? "operations-choice-card is-selected"
                        : "operations-choice-card"
                    }
                  >
                    <input
                      type="radio"
                      name="exchangeHandling"
                      value="RETURN_TO_BUYER"
                      checked={selectedHandling === "RETURN_TO_BUYER"}
                      onChange={() => setHandling("RETURN_TO_BUYER")}
                    />
                    <span>
                      <strong>Return</strong>
                      <small>Return the exchange vehicle to the buyer</small>
                    </span>
                  </label>
                </div>
                {errors.exchangeHandling && (
                  <p className="operations-section-error" role="alert">
                    {errors.exchangeHandling}
                  </p>
                )}
                {selectedHandling === "KEEP_AND_BUYBACK" && (
                  <div className="operations-form-grid">
                    <FormField
                      label="Exchange buyback amount"
                      required
                      error={errors.exchangeBuybackAmount}
                      hint={`Cannot exceed the original exchange value of ${formatCurrency(originalExchangeAmount)}.`}
                    >
                      <Input
                        name="exchangeBuybackAmount"
                        type="number"
                        min="0"
                        max={originalExchangeAmount}
                        step="0.01"
                        required
                        value={displayedBuybackAmount}
                        onChange={(event) =>
                          setBuybackAmount(event.target.value)
                        }
                      />
                    </FormField>
                  </div>
                )}
              </Section>
            )}
            <Section
              title="Sold vehicle deductions"
              actions={
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setSold((rows) => [...rows, { description: "", amount: 0 }])
                  }
                >
                  <Plus /> Add
                </Button>
              }
            >
              <DeductionRows
                prefix="sold"
                rows={sold}
                errors={errors}
                onChange={setSold}
              />
            </Section>
            {query.data.exchangeVehicle &&
              selectedHandling === "KEEP_AND_BUYBACK" && (
                <Section
                  title="Exchange vehicle deductions"
                  actions={
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setExchange((rows) => [
                          ...rows,
                          { description: "", amount: 0 },
                        ])
                      }
                    >
                      <Plus /> Add
                    </Button>
                  }
                >
                  <DeductionRows
                    prefix="exchange"
                    rows={exchange}
                    errors={errors}
                    onChange={setExchange}
                  />
                </Section>
              )}
            <Section title="Refund summary">
              <dl className="operations-refund-summary">
                <div>
                  <dt>Customer paid</dt>
                  <dd>{formatCurrency(query.data.customerPaidAmount)}</dd>
                </div>
                {selectedHandling === "KEEP_AND_BUYBACK" && (
                  <div>
                    <dt>+ Exchange buyback</dt>
                    <dd>{formatCurrency(parsedBuybackAmount)}</dd>
                  </div>
                )}
                <div>
                  <dt>− Sold vehicle deductions</dt>
                  <dd>{formatCurrency(soldDeductionsTotal)}</dd>
                </div>
                {selectedHandling === "KEEP_AND_BUYBACK" && (
                  <div>
                    <dt>− Exchange deductions</dt>
                    <dd>{formatCurrency(exchangeDeductionsTotal)}</dd>
                  </div>
                )}
                <div className="operations-refund-total">
                  <dt>Refund amount</dt>
                  <dd>{formatCurrency(Math.max(0, computedRefund))}</dd>
                </div>
              </dl>
              {errors.refundAmount && (
                <p className="operations-section-error" role="alert">
                  {errors.refundAmount}
                </p>
              )}
            </Section>
            <FormActions
              cancelTo={`${SALES}/${saleId}`}
              pending={mutation.isPending}
              label="Create return"
            />
          </form>
        )}
      </QueryBoundary>
    </RouteFormPage>
  );
};

export const SaleReturnRefundRoute = () => {
  const id = useNumericParam("returnId");
  const refundId = useNumericParam("refundId");
  const client = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["operations", "sale-return", id],
    queryFn: () => operationsApi.saleReturns.detail(id!),
    enabled: !!id,
  });
  const refund = query.data?.refunds?.find((item) => item.id === refundId);
  const maximumRefund =
    query.data &&
    (refundId && refund
      ? query.data.remainingRefund + refund.amount
      : query.data.remainingRefund);
  const mutation = useMutation({
    mutationFn: (value: PaymentInput) =>
      refundId
        ? operationsApi.saleReturns.updateRefund(id!, refundId, {
            ...value,
            version: refund?.version ?? 0,
          })
        : operationsApi.saleReturns.refund(id!, value),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["operations", "sale-return", id],
      });
      void client.invalidateQueries({
        queryKey: ["operations", "sale-returns"],
      });
      toast.success(refundId ? "Refund updated" : "Refund recorded");
      navigate(`${RETURNS}/${id}`);
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage title={refundId ? "Edit refund" : "Record refund"}>
      <QueryBoundary pending={query.isPending} error={query.error}>
        {refundId && !refund ? (
          <InvalidRoute />
        ) : (
          <PaymentForm
            key={`${refundId ?? "new"}-${maximumRefund ?? 0}`}
            payment={refund}
            enforceAccountBalance
            maximum={maximumRefund}
            maximumMessage={
              maximumRefund === undefined
                ? undefined
                : `Refund amount cannot exceed ${formatCurrency(maximumRefund)}`
            }
            defaultAmount={
              refundId || !maximumRefund ? undefined : maximumRefund
            }
            pending={mutation.isPending}
            cancelTo={`${RETURNS}/${id}`}
            submitLabel={refundId ? "Update refund" : "Record refund"}
            onSubmit={(value) => mutation.mutate(value)}
          />
        )}
      </QueryBoundary>
    </RouteFormPage>
  );
};
