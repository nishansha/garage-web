import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
} from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  operationsApi,
  type OutstandingItem,
  type Outstandings,
} from "../../services/operations";
import { QueryBoundary } from "./common";

type Kind =
  | "purchase-payables"
  | "purchase-return-receivables"
  | "sales-receivables"
  | "sale-return-payables";
const config: Record<
  Kind,
  {
    title: string;
    description: string;
    query: () => Promise<Outstandings>;
    detail: (item: OutstandingItem) => string;
  }
> = {
  "purchase-payables": {
    title: "Purchase payables",
    description: "Outstanding amounts owed to vehicle vendors.",
    query: operationsApi.purchases.payables,
    detail: (item) => `/purchase/purchases/${item.purchaseId}`,
  },
  "purchase-return-receivables": {
    title: "Purchase-return receivables",
    description: "Refunds still due from vendors.",
    query: operationsApi.purchaseReturns.receivables,
    detail: (item) => `/purchase/returns/${item.purchaseReturnId}`,
  },
  "sales-receivables": {
    title: "Sales receivables",
    description: "Customer and finance-company balances still due.",
    query: operationsApi.sales.receivables,
    detail: (item) => `/sales/sales/${item.saleId}`,
  },
  "sale-return-payables": {
    title: "Sale-return payables",
    description: "Refund balances still owed to customers.",
    query: operationsApi.saleReturns.payables,
    detail: (item) => `/sales/returns/${item.saleReturnId}`,
  },
};

const OutstandingRoute = ({ kind }: { kind: Kind }) => {
  const navigate = useNavigate();
  const itemConfig = config[kind];
  const query = useQuery({
    queryKey: ["operations", "outstanding", kind],
    queryFn: itemConfig.query,
  });
  return (
    <>
      <PageHeader
        title={itemConfig.title}
        description={itemConfig.description}
      />
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <div className="operations-kpis">
          <StatCard label="Open records" value={query.data?.totalCount ?? 0} />
          <StatCard
            label="Total outstanding"
            value={formatCurrency(query.data?.totalPendingAmount)}
          />
        </div>
        <Card>
          <DataTable
            caption={itemConfig.title}
            rows={query.data?.items ?? []}
            onRowClick={(row) => navigate(itemConfig.detail(row))}
            rowKey={(row) =>
              String(
                row.purchaseId ??
                  row.purchaseReturnId ??
                  row.saleId ??
                  row.saleReturnId,
              )
            }
            columns={[
              {
                key: "reference",
                header: "Reference",
                cell: (row) => (
                  <strong>
                    {row.referenceNo ??
                      row.purchaseReferenceNo ??
                      row.invoiceNo ??
                      "View"}
                  </strong>
                ),
              },
              {
                key: "vehicle",
                header: "Vehicle",
                cell: (row) => row.vehicleNo,
              },
              {
                key: "party",
                header: "Party",
                cell: (row) => row.vendorName ?? row.customerName ?? "—",
              },
              {
                key: "mobile",
                header: "Mobile",
                cell: (row) => row.vendorMobile ?? row.customerMobile ?? "—",
              },
              {
                key: "date",
                header: "Transaction date",
                cell: (row) =>
                  formatDate(
                    row.purchaseDate ?? row.saleDate ?? row.returnDate,
                  ),
              },
              {
                key: "last",
                header: "Last activity",
                cell: (row) =>
                  formatDate(
                    row.lastPaymentDate ??
                      row.lastReceiptDate ??
                      row.lastRefundDate,
                  ),
              },
              {
                key: "pending",
                header: "Pending",
                align: "right",
                cell: (row) => formatCurrency(row.pendingAmount),
              },
            ]}
          />
        </Card>
      </QueryBoundary>
    </>
  );
};

export const PurchasePayablesRoute = () => (
  <OutstandingRoute kind="purchase-payables" />
);
export const PurchaseReturnReceivablesRoute = () => (
  <OutstandingRoute kind="purchase-return-receivables" />
);
export const SalesReceivablesRoute = () => (
  <OutstandingRoute kind="sales-receivables" />
);
export const PurchaseRcDueRoute = () => {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["operations", "outstanding", "purchase-rc-due"],
    queryFn: operationsApi.purchases.rcDueSummary,
  });
  return (
    <>
      <PageHeader
        title="Pending RCD"
        description="Track RCD amounts still due from purchase vendors."
      />
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <div className="operations-kpis">
          <StatCard label="Open records" value={query.data?.totalCount ?? 0} />
          <StatCard
            label="Total pending RCD"
            value={formatCurrency(query.data?.totalPendingAmount)}
          />
        </div>
        {!query.data?.items.length ? (
          <EmptyState
            title="No pending RCD"
            description="Settled RCDs will drop off this list automatically."
          />
        ) : (
          <Card>
            <DataTable
              caption="Pending RCD"
              rows={query.data.items}
              rowKey={(row) => String(row.purchaseId)}
              onRowClick={(row) =>
                navigate(`/purchase/purchases/${row.purchaseId}`)
              }
              columns={[
                {
                  key: "invoice",
                  header: "Sale invoice",
                  cell: (row) => <strong>{row.invoiceNo ?? "—"}</strong>,
                },
                {
                  key: "vehicle",
                  header: "Vehicle",
                  cell: (row) => row.vehicleNo,
                },
                {
                  key: "saleDate",
                  header: "Sale date",
                  cell: (row) => formatDate(row.saleDate),
                },
                {
                  key: "vendor",
                  header: "Vendor",
                  cell: (row) => row.vendorName,
                },
                {
                  key: "mobile",
                  header: "Mobile",
                  cell: (row) => row.vendorMobile ?? "—",
                },
                {
                  key: "amount",
                  header: "RC Deposits",
                  align: "right",
                  cell: (row) => formatCurrency(row.amount),
                },
                {
                  key: "pending",
                  header: "Pending",
                  align: "right",
                  cell: (row) => formatCurrency(row.pendingAmount),
                },
                {
                  key: "lastReceiptDate",
                  header: "Last receipt",
                  cell: (row) => formatDate(row.lastReceiptDate),
                },
                {
                  key: "actions",
                  header: "",
                  cell: (row) => (
                    <Link
                      to={`/purchase/purchases/${row.purchaseId}/rc-due-receipts/new`}
                    >
                      Record receipt
                    </Link>
                  ),
                },
              ]}
            />
          </Card>
        )}
      </QueryBoundary>
    </>
  );
};
export const SaleReturnPayablesRoute = () => (
  <OutstandingRoute kind="sale-return-payables" />
);
