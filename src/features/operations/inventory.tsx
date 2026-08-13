import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  DataTable,
  DateInput,
  Input,
  PageHeader,
  Pagination,
  SearchFilters,
  Select,
} from "../../components/ui";
import { Can } from "../../components/Can";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  operationsApi,
  type SearchInput,
  type Stock,
} from "../../services/operations";
import { warehouseApi } from "../../services/warehouse";
import {
  Detail,
  DetailGrid,
  InvalidRoute,
  Money,
  QueryBoundary,
  Section,
  useNumericParam,
} from "./common";

const optionalFilterId = (raw: string): number | undefined => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const STOCK_FILTER_KEYS = [
  "fromDate",
  "toDate",
  "vehicleNo",
  "status",
  "brandId",
  "modelId",
  "variantId",
  "fuelTypeId",
  "warehouseId",
] as const satisfies ReadonlyArray<keyof SearchInput>;

const isActiveFilterValue = (value: unknown) =>
  value !== undefined && value !== null && value !== "";

const countActiveStockFilters = (value: SearchInput, includeStatus: boolean) =>
  STOCK_FILTER_KEYS.filter(
    (key) =>
      (includeStatus || key !== "status") && isActiveFilterValue(value[key]),
  ).length;

const clearStockFilters = (value: SearchInput): SearchInput => ({
  ...(value.searchText ? { searchText: value.searchText } : {}),
});

const StockFilters = ({
  value,
  onChange,
  showStatus = true,
}: {
  value: SearchInput;
  onChange: (value: SearchInput) => void;
  showStatus?: boolean;
}) => {
  const brandId = value.brandId ?? 0;
  const modelId = value.modelId ?? 0;
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
  const warehouses = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehouseApi.list,
  });

  return (
    <SearchFilters
      query={value.searchText ?? ""}
      onQueryChange={(searchText) => onChange({ ...value, searchText })}
      collapsible
      activeFilterCount={countActiveStockFilters(value, showStatus)}
      onClearFilters={() => onChange(clearStockFilters(value))}
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
      {showStatus && (
        <Select
          aria-label="Stock status"
          value={value.status ?? ""}
          onChange={(event) =>
            onChange({ ...value, status: event.target.value || undefined })
          }
          options={[
            { value: "", label: "All current stock" },
            { value: "AVAILABLE", label: "Available" },
            { value: "PENDING_DELIVERY", label: "Pending delivery" },
          ]}
        />
      )}
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
      <Select
        aria-label="Warehouse"
        value={value.warehouseId || ""}
        onChange={(event) =>
          onChange({
            ...value,
            warehouseId: optionalFilterId(event.target.value),
          })
        }
      >
        <option value="">All warehouses</option>
        {warehouses.data?.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
    </SearchFilters>
  );
};

const InventoryList = ({ sold }: { sold: boolean }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchInput>({});
  const status = sold ? "SOLD" : undefined;
  const query = useQuery({
    queryKey: ["operations", "stock", status, page, filters],
    queryFn: () => operationsApi.stock.list(page - 1, 20, status, filters),
  });
  const rows = (query.data?.products ?? []).filter(
    (row) => sold || row.status !== "SOLD",
  );
  return (
    <>
      <PageHeader
        title={sold ? "Sold inventory" : "Stock"}
        description={
          sold
            ? "Review sold vehicles and realized profit."
            : "Review available and pending-delivery vehicles."
        }
      />
      <StockFilters
        value={filters}
        showStatus={!sold}
        onChange={(value) => {
          setPage(1);
          setFilters(value);
        }}
      />
      <QueryBoundary pending={query.isPending} error={query.error}>
        <DataTable<Stock>
          caption={sold ? "Sold inventory" : "Stock inventory"}
          rows={rows}
          emptyMessage={sold ? "No sold inventory" : "No stock yet"}
          emptyDescription={
            sold
              ? "Sold vehicles will appear here after a sale is recorded."
              : "Available vehicles will appear here once they are purchased."
          }
          rowKey={(row) => String(row.productId)}
          onRowClick={(row) =>
            navigate(`/inventory/${sold ? "sold" : "stock"}/${row.productId}`)
          }
          columns={[
            {
              key: "vehicle",
              header: "Vehicle",
              cell: (row) => <strong>{row.productCode}</strong>,
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
              header: sold ? "Sold date" : "Purchased",
              cell: (row) => formatDate(sold ? row.soldDate : row.purchaseDate),
            },
            {
              key: "cost",
              header: "Landed cost",
              align: "right",
              cell: (row) => formatCurrency(row.landedCost ?? row.totalAmount),
            },
            ...(sold
              ? [
                  {
                    key: "sale",
                    header: "Sale",
                    align: "right" as const,
                    cell: (row: Stock) =>
                      formatCurrency(row.saleRate ?? row.soldAmount),
                  },
                  {
                    key: "profit",
                    header: "Profit",
                    align: "right" as const,
                    cell: (row: Stock) => formatCurrency(row.profit),
                  },
                ]
              : []),
            {
              key: "status",
              header: "Status",
              cell: (row) => (
                <Badge
                  tone={
                    row.status === "SOLD"
                      ? "neutral"
                      : row.status === "AVAILABLE"
                        ? "success"
                        : "warning"
                  }
                >
                  {row.status?.replaceAll("_", " ") ?? "—"}
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

export const InventoryStockRoute = () => <InventoryList sold={false} />;
export const InventorySoldRoute = () => <InventoryList sold />;

export const InventoryDetailRoute = () => {
  const id = useNumericParam("inventoryId");
  const query = useQuery({
    queryKey: ["operations", "stock-detail", id],
    queryFn: () => operationsApi.stock.detail(id!),
    enabled: !!id,
  });
  if (!id) return <InvalidRoute />;
  const item = query.data;
  const returnable =
    item?.status === "AVAILABLE" || item?.status === "PENDING_DELIVERY";
  return (
    <>
      <PageHeader
        title={item?.productCode ?? "Inventory detail"}
        description={
          item
            ? `${item.brandName} ${item.modelName} ${item.variantName}`
            : undefined
        }
        actions={
          returnable && (
            <Can resource="PURCHASE_RETURN" privilege="CREATE">
              <Link
                className="button button--danger"
                to={`/purchase/returns/new/${id}`}
              >
                Return to vendor
              </Link>
            </Can>
          )
        }
      />
      <QueryBoundary pending={query.isPending} error={query.error}>
        {item && (
          <>
            <Section title="Vehicle">
              {(item.soldDate ||
                item.saleRate != null ||
                item.profit != null) && (
                <div className="operations-inventory-metrics">
                  <div>
                    <span>Landed cost</span>
                    <strong>
                      <Money value={item.landedCost} />
                    </strong>
                  </div>
                  <div>
                    <span>Sale rate</span>
                    <strong>
                      <Money value={item.saleRate} />
                    </strong>
                  </div>
                  <div
                    className={
                      (item.profit ?? 0) >= 0 ? "is-positive" : "is-negative"
                    }
                  >
                    <span>Profit</span>
                    <strong>
                      <Money value={item.profit} />
                    </strong>
                  </div>
                </div>
              )}
              <DetailGrid>
                <Detail
                  label="Status"
                  value={item.status?.replaceAll("_", " ")}
                />
                <Detail
                  label="Purchase date"
                  value={formatDate(item.purchaseDate)}
                />
                <Detail label="Vendor" value={item.vendorName} />
                <Detail label="Vendor mobile" value={item.vendorMobileNo} />
                <Detail label="Color" value={item.color} />
                <Detail label="Fuel type" value={item.fuelType} />
                <Detail label="Odometer" value={item.odometer} />
                <Detail
                  label="Purchased amount"
                  value={<Money value={item.purchasedAmount} />}
                />
                <Detail
                  label="Purchase expenses"
                  value={<Money value={item.purchaseExpense} />}
                />
                {!(
                  item.soldDate ||
                  item.saleRate != null ||
                  item.profit != null
                ) && (
                  <Detail
                    label="Landed cost"
                    value={<Money value={item.landedCost} />}
                  />
                )}
                <Detail label="Sold date" value={formatDate(item.soldDate)} />
                <Detail label="Customer" value={item.customerName} />
                <Detail label="Customer mobile" value={item.customerMobileNo} />
              </DetailGrid>
            </Section>
            <Section title="Expenses">
              <DataTable
                caption="Inventory expenses"
                rows={item.expenses ?? []}
                emptyMessage="No expenses"
                emptyDescription="Expenses recorded against this vehicle will appear here."
                rowKey={(row) => String(row.id)}
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    cell: (row) => formatDate(row.date),
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
                ]}
              />
            </Section>
          </>
        )}
      </QueryBoundary>
    </>
  );
};
