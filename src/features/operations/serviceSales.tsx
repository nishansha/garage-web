import { useState } from "react";
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
} from "../../components/ui";
import { Can } from "../../components/Can";
import { formatCurrency, formatDate } from "../../lib/utils";
import { applyFieldValidationErrors } from "../../lib/validation";
import { adminApi } from "../../services/admin";
import {
  type PaymentInput,
  type PaymentStatus,
} from "../../services/operations";
import {
  serviceOfferingApi,
  serviceSaleApi,
  type ServiceSale,
  type ServiceSaleInput,
  type ServiceSaleItemInput,
  type ServiceSaleSearch,
} from "../../services/serviceSales";
import { warehouseApi, warehousesFor } from "../../services/warehouse";
import { DownloadDocumentButton } from "./OrderDocument";
import { ServiceSaleDocument } from "./ServiceSaleDocument";
import {
  FormActions,
  InvalidRoute,
  PaymentForm,
  QueryBoundary,
  RouteFormPage,
  Section,
  invalidateOutstanding,
  notifyError,
  today,
  useCompanyIdFromRecord,
  useNumericParam,
} from "./common";

const SERVICE_SALES = "/sales/service-sales";

const fieldError = (error: unknown): string | undefined =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string"
    ? error.message
    : undefined;

const paymentTone = (
  status?: PaymentStatus | string | null,
): "success" | "warning" | "info" => {
  if (status === "PAID") return "success";
  if (status === "PARTIAL") return "info";
  return "warning";
};

const customerLabel = (sale: ServiceSale) =>
  sale.customerName?.trim() || sale.walkInCustomerName?.trim() || "Walk-in";

const emptyItem = (): ServiceSaleItemInput => ({
  description: "",
  qty: 1,
  rate: 0,
});

type CustomerMode = "existing" | "walk-in";

type ServiceSaleFormValues = {
  warehouseId: number;
  saleDate: string;
  notes: string;
  customerId: number;
  walkInCustomerName: string;
  items: ServiceSaleItemInput[];
};

const ServiceSaleFilters = ({
  value,
  onChange,
}: {
  value: ServiceSaleSearch;
  onChange: (value: ServiceSaleSearch) => void;
}) => {
  const warehouses = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehouseApi.list,
  });
  return (
    <SearchFilters
      query={value.searchText ?? ""}
      onQueryChange={(searchText) => onChange({ ...value, searchText })}
      collapsible
      activeFilterCount={
        [value.fromDate, value.toDate, value.warehouseId].filter(Boolean).length
      }
      onClearFilters={() =>
        onChange(value.searchText ? { searchText: value.searchText } : {})
      }
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
      <Select
        aria-label="Warehouse"
        value={value.warehouseId || ""}
        onChange={(event) => {
          const id = Number(event.target.value);
          onChange({
            ...value,
            warehouseId: Number.isInteger(id) && id > 0 ? id : undefined,
          });
        }}
      >
        <option value="">All warehouses</option>
        {warehousesFor(warehouses.data, "SERVICES").map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
    </SearchFilters>
  );
};

export const ServiceSalesListRoute = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ServiceSaleSearch>({});
  const query = useQuery({
    queryKey: ["operations", "service-sales", page, filters],
    queryFn: () => serviceSaleApi.list(page - 1, 20, filters),
  });
  const rows = query.data?.serviceSales ?? [];
  return (
    <>
      <PageHeader
        title="Service Invoice"
        description="Record service work with no inventory."
        actions={
          <Can resource="SERVICE_SALE" privilege="CREATE">
            <Link
              className="button button--primary"
              to={`${SERVICE_SALES}/new`}
            >
              <Plus /> New service sale
            </Link>
          </Can>
        }
      />
      <ServiceSaleFilters
        value={filters}
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
          caption="Service Invoice"
          rows={rows}
          emptyMessage="No service invoice yet"
          emptyDescription="Service invoice will appear here once they are recorded."
          rowKey={(row) => String(row.id)}
          onRowClick={(row) => navigate(`${SERVICE_SALES}/${row.id}`)}
          columns={[
            {
              key: "invoice",
              header: "Invoice",
              cell: (row) => <strong>{row.invoiceNo}</strong>,
            },
            {
              key: "date",
              header: "Date",
              cell: (row) => formatDate(row.saleDate),
            },
            {
              key: "customer",
              header: "Customer",
              cell: (row) => customerLabel(row),
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              cell: (row) => formatCurrency(row.totalAmount),
            },
            {
              key: "paid",
              header: "Paid",
              align: "right",
              cell: (row) => formatCurrency(row.paidAmount),
            },
            {
              key: "status",
              header: "Payment",
              cell: (row) => (
                <Badge tone={paymentTone(row.paymentStatus)}>
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

const ServiceSaleEditor = ({ sale }: { sale?: ServiceSale }) => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [customerMode, setCustomerMode] = useState<CustomerMode>(
    sale?.customerId ? "existing" : "walk-in",
  );
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceSaleFormValues>({
    defaultValues: {
      warehouseId: sale?.warehouseId ?? 0,
      saleDate: sale?.saleDate ?? today(),
      notes: sale?.notes ?? "",
      customerId: sale?.customerId ?? 0,
      walkInCustomerName: sale?.walkInCustomerName ?? "",
      items: sale?.items?.length
        ? sale.items.map((item) => ({
            serviceOfferingId: item.serviceOfferingId ?? undefined,
            description: item.description,
            qty: Number(item.qty),
            rate: Number(item.rate),
          }))
        : [emptyItem()],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const warehouseId = watch("warehouseId");
  const items = watch("items");
  const warehouses = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehouseApi.list,
  });
  const serviceWarehouses = warehousesFor(warehouses.data, "SERVICES");
  const warehouseOptions =
    sale?.warehouseId &&
    !serviceWarehouses.some((item) => item.id === sale.warehouseId)
      ? [
          ...(warehouses.data?.filter((item) => item.id === sale.warehouseId) ??
            []),
          ...serviceWarehouses,
        ]
      : serviceWarehouses;
  const customers = useQuery({
    queryKey: ["admin", "customers", "picker"],
    queryFn: () => adminApi.getCustomers(0, 100),
  });
  const offerings = useQuery({
    queryKey: ["service-offerings", warehouseId],
    queryFn: () => serviceOfferingApi.list(warehouseId),
    enabled: Number(warehouseId) > 0,
  });
  const mutation = useMutation({
    mutationFn: (payload: ServiceSaleInput) =>
      sale
        ? serviceSaleApi.update(sale.id, { ...payload, version: sale.version })
        : serviceSaleApi.create(payload),
    onSuccess: async (result) => {
      const id = sale?.id ?? result.id;
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["operations", "service-sales"],
        }),
        invalidateOutstanding(client, "service-receivables"),
        id
          ? client.invalidateQueries({
              queryKey: ["operations", "service-sale", id],
            })
          : Promise.resolve(),
      ]);
      toast.success(sale ? "Service sale updated" : "Service sale created");
      navigate(id ? `${SERVICE_SALES}/${id}` : SERVICE_SALES);
    },
    onError: (error) => {
      if (!applyFieldValidationErrors(error, setError, "serviceSale"))
        notifyError(error);
    },
  });

  const submit = handleSubmit((value) => {
    const hasCustomer = customerMode === "existing" && value.customerId > 0;
    const walkIn = value.walkInCustomerName.trim();
    if (customerMode === "existing" && !hasCustomer) {
      setError("customerId", { message: "Select a customer" });
      return;
    }
    if (customerMode === "walk-in" && !walkIn) {
      setError("walkInCustomerName", { message: "Walk-in name is required" });
      return;
    }
    mutation.mutate({
      warehouseId: value.warehouseId,
      saleDate: value.saleDate,
      notes: value.notes.trim() || undefined,
      ...(hasCustomer ? { customerId: value.customerId } : {}),
      ...(customerMode === "walk-in" ? { walkInCustomerName: walkIn } : {}),
      items: value.items.map((item) => ({
        description: item.description.trim(),
        qty: Number(item.qty),
        rate: Number(item.rate),
        ...(item.serviceOfferingId
          ? { serviceOfferingId: item.serviceOfferingId }
          : {}),
      })),
    });
  });

  const applyOffering = (index: number, offeringId: number) => {
    const offering = offerings.data?.find((item) => item.id === offeringId);
    setValue(`items.${index}.serviceOfferingId`, offeringId || undefined);
    if (!offering) return;
    setValue(`items.${index}.description`, offering.name, {
      shouldValidate: true,
    });
    setValue(`items.${index}.rate`, Number(offering.defaultRate), {
      shouldValidate: true,
    });
  };

  return (
    <form className="operations-form" noValidate onSubmit={submit}>
      <Section title="Sale details">
        <div className="operations-form-grid">
          <FormField
            label="Warehouse"
            required
            error={fieldError(errors.warehouseId)}
          >
            <Select
              disabled={Boolean(sale)}
              {...register("warehouseId", {
                required: "Warehouse is required",
                min: { value: 1, message: "Warehouse is required" },
                valueAsNumber: true,
              })}
            >
              <option value="">Select warehouse</option>
              {warehouseOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Sale date"
            required
            error={fieldError(errors.saleDate)}
          >
            <DateInput
              {...register("saleDate", { required: "Sale date is required" })}
            />
          </FormField>
        </div>
        <fieldset className="operations-radio-group">
          <legend>Customer</legend>
          <label>
            <input
              type="radio"
              name="customerMode"
              checked={customerMode === "existing"}
              onChange={() => setCustomerMode("existing")}
            />
            Existing customer
          </label>
          <label>
            <input
              type="radio"
              name="customerMode"
              checked={customerMode === "walk-in"}
              onChange={() => setCustomerMode("walk-in")}
            />
            Walk-in
          </label>
        </fieldset>
        {customerMode === "existing" ? (
          <FormField
            label="Customer"
            required
            error={fieldError(errors.customerId)}
          >
            <Select {...register("customerId", { valueAsNumber: true })}>
              <option value="">Select customer</option>
              {(customers.data?.customers ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.mobile ? ` · ${item.mobile}` : ""}
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField
            label="Walk-in name"
            required
            error={fieldError(errors.walkInCustomerName)}
          >
            <Input
              {...register("walkInCustomerName")}
              placeholder="Customer name"
            />
          </FormField>
        )}
      </Section>
      <Section
        title="Line items"
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => append(emptyItem())}
          >
            <Plus size={14} /> Add line
          </Button>
        }
      >
        {fields.map((field, index) => {
          const qty = Number(items?.[index]?.qty || 0);
          const rate = Number(items?.[index]?.rate || 0);
          return (
            <fieldset key={field.id} className="operations-form-grid">
              <FormField label="Catalog service">
                <Select
                  value={items?.[index]?.serviceOfferingId || ""}
                  disabled={Number(warehouseId) <= 0}
                  onChange={(event) =>
                    applyOffering(index, Number(event.target.value))
                  }
                >
                  <option value="">Ad-hoc line</option>
                  {(offerings.data ?? [])
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {formatCurrency(item.defaultRate)}
                      </option>
                    ))}
                </Select>
              </FormField>
              <FormField
                label="Description"
                required
                error={fieldError(errors.items?.[index]?.description)}
              >
                <Input
                  {...register(`items.${index}.description`, {
                    required: "Description is required",
                  })}
                />
              </FormField>
              <FormField
                label="Qty"
                required
                error={fieldError(errors.items?.[index]?.qty)}
              >
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...register(`items.${index}.qty`, {
                    required: "Qty is required",
                    min: {
                      value: 0.01,
                      message: "Qty must be greater than zero",
                    },
                    valueAsNumber: true,
                  })}
                />
              </FormField>
              <FormField
                label="Rate"
                required
                error={fieldError(errors.items?.[index]?.rate)}
              >
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...register(`items.${index}.rate`, {
                    required: "Rate is required",
                    min: {
                      value: 0.01,
                      message: "Rate must be greater than zero",
                    },
                    valueAsNumber: true,
                  })}
                />
              </FormField>
              <FormField label="Amount">
                <Input readOnly value={formatCurrency(qty * rate)} />
              </FormField>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remove line ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 />
                </Button>
              )}
            </fieldset>
          );
        })}
      </Section>
      <Section title="Notes">
        <FormField label="Additional details">
          <Textarea {...register("notes")} />
        </FormField>
      </Section>
      <FormActions
        cancelTo={sale ? `${SERVICE_SALES}/${sale.id}` : SERVICE_SALES}
        pending={mutation.isPending}
        label={sale ? "Update service sale" : "Create service sale"}
      />
    </form>
  );
};

export const ServiceSaleCreateRoute = () => (
  <RouteFormPage
    title="New service sale"
    description="Record a walk-in or customer service invoice."
  >
    <ServiceSaleEditor />
  </RouteFormPage>
);

export const ServiceSaleEditRoute = () => {
  const id = useNumericParam("serviceSaleId");
  const query = useQuery({
    queryKey: ["operations", "service-sale", id],
    queryFn: () => serviceSaleApi.get(id!),
    enabled: !!id,
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage title="Edit service sale">
      <QueryBoundary pending={query.isPending} error={query.error}>
        {query.data && <ServiceSaleEditor sale={query.data} />}
      </QueryBoundary>
    </RouteFormPage>
  );
};

export const ServiceSaleDetailRoute = () => {
  const id = useNumericParam("serviceSaleId");
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["operations", "service-sale", id],
    queryFn: () => serviceSaleApi.get(id!),
    enabled: !!id,
  });
  const deletion = useMutation({
    mutationFn: () => serviceSaleApi.delete(id!),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["operations", "service-sales"],
      });
      void invalidateOutstanding(client, "service-receivables");
      toast.success("Service sale deleted");
      navigate(SERVICE_SALES);
    },
    onError: notifyError,
  });
  const removePayment = useMutation({
    mutationFn: (paymentId: number) =>
      serviceSaleApi.deletePayment(id!, paymentId),
    onSuccess: async () => {
      setDeletePaymentId(null);
      toast.success("Payment deleted");
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["operations", "service-sale", id],
        }),
        client.invalidateQueries({
          queryKey: ["operations", "service-sales"],
        }),
        invalidateOutstanding(client, "service-receivables"),
      ]);
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  const sale = query.data;
  const pending =
    Number(sale?.totalAmount ?? 0) - Number(sale?.paidAmount ?? 0);
  return (
    <>
      <PageHeader
        title={sale?.invoiceNo ?? "Service sale"}
        description={sale ? customerLabel(sale) : undefined}
        actions={
          sale && (
            <>
              <DownloadDocumentButton />
              {pending > 0 && (
                <Can resource="SERVICE_SALE" privilege="CREATE">
                  <Link
                    className="button button--secondary"
                    to={`${SERVICE_SALES}/${id}/payment`}
                  >
                    Record payment
                  </Link>
                </Can>
              )}
              <Can resource="SERVICE_SALE" privilege="UPDATE">
                <Link
                  className="button button--secondary"
                  to={`${SERVICE_SALES}/${id}/edit`}
                >
                  Edit
                </Link>
              </Can>
              <Can resource="SERVICE_SALE" privilege="DELETE">
                <Button variant="danger" onClick={() => setConfirm(true)}>
                  Delete
                </Button>
              </Can>
            </>
          )
        }
      />
      <QueryBoundary pending={query.isPending} error={query.error}>
        {sale && (
          <ServiceSaleDocument
            sale={sale}
            saleId={id}
            onDeletePayment={setDeletePaymentId}
          />
        )}
      </QueryBoundary>
      <ConfirmDialog
        open={confirm}
        title="Delete service sale?"
        message="This deletes the sale and reverses its accounting entries."
        danger
        loading={deletion.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => deletion.mutate()}
      />
      <ConfirmDialog
        open={deletePaymentId !== null}
        title="Delete payment?"
        message="This reverses the payment journal entry."
        danger
        loading={removePayment.isPending}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={() =>
          deletePaymentId != null && removePayment.mutate(deletePaymentId)
        }
      />
    </>
  );
};

export const ServiceSalePaymentRoute = () => {
  const id = useNumericParam("serviceSaleId");
  const client = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["operations", "service-sale", id],
    queryFn: () => serviceSaleApi.get(id!),
    enabled: !!id,
  });
  const pending =
    Number(query.data?.totalAmount ?? 0) - Number(query.data?.paidAmount ?? 0);
  const companyId = useCompanyIdFromRecord({
    companyId: query.data?.companyId,
    warehouseId: query.data?.warehouseId,
  });
  const mutation = useMutation({
    mutationFn: (value: PaymentInput) => serviceSaleApi.payment(id!, value),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["operations", "service-sale", id],
        }),
        client.invalidateQueries({
          queryKey: ["operations", "service-sales"],
        }),
        invalidateOutstanding(client, "service-receivables"),
      ]);
      toast.success("Payment recorded");
      navigate(`${SERVICE_SALES}/${id}`);
    },
    onError: notifyError,
  });
  if (!id) return <InvalidRoute />;
  return (
    <RouteFormPage title="Record service sale payment">
      <QueryBoundary pending={query.isPending} error={query.error}>
        <PaymentForm
          companyId={companyId}
          defaultAmount={pending > 0 ? pending : undefined}
          maximum={pending > 0 ? pending : undefined}
          pending={mutation.isPending}
          cancelTo={`${SERVICE_SALES}/${id}`}
          submitLabel="Record payment"
          onSubmit={(value) => mutation.mutate(value)}
        />
      </QueryBoundary>
    </RouteFormPage>
  );
};
