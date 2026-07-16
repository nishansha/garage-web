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
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  operationsApi,
  type SearchInput,
  type Stock,
} from "../../services/operations";
import {
  Detail,
  DetailGrid,
  InvalidRoute,
  Money,
  QueryBoundary,
  Section,
  useNumericParam,
} from "./common";

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
        {!sold && (
          <Select
            aria-label="Stock status"
            value={filters.status ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value })
            }
            options={[
              { value: "", label: "All current stock" },
              { value: "AVAILABLE", label: "Available" },
              { value: "PENDING_DELIVERY", label: "Pending delivery" },
            ]}
          />
        )}
      </SearchFilters>
      <QueryBoundary pending={query.isPending} error={query.error}>
        <DataTable<Stock>
          caption={sold ? "Sold inventory" : "Stock inventory"}
          rows={rows}
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
            <Link
              className="button button--danger"
              to={`/purchase/returns/new/${id}`}
            >
              Return to vendor
            </Link>
          )
        }
      />
      <QueryBoundary pending={query.isPending} error={query.error}>
        {item && (
          <>
            <Section title="Vehicle">
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
                <Detail
                  label="Landed cost"
                  value={<Money value={item.landedCost} />}
                />
                <Detail label="Sold date" value={formatDate(item.soldDate)} />
                <Detail
                  label="Sale rate"
                  value={<Money value={item.saleRate} />}
                />
                <Detail label="Profit" value={<Money value={item.profit} />} />
                <Detail label="Customer" value={item.customerName} />
                <Detail label="Customer mobile" value={item.customerMobileNo} />
              </DetailGrid>
            </Section>
            <Section title="Expenses">
              <DataTable
                caption="Inventory expenses"
                rows={item.expenses ?? []}
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
