import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
} from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  operationsApi,
  type FinanceReceivableCompany,
  type OutstandingItem,
  type Outstandings,
  type SalePaymentStatus,
} from "../../services/operations";
import { QueryBoundary } from "./common";

type Kind =
  "purchase-payables" | "purchase-return-receivables" | "sale-return-payables";
type ReceivablesTab = "customers" | "finance";

const paymentTone = (
  status?: SalePaymentStatus | null,
): "success" | "warning" | "info" => {
  if (status === "PAID") return "success";
  if (status === "FINANCE_PENDING") return "info";
  return "warning";
};
const config: Record<
  Kind,
  {
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    query: () => Promise<Outstandings>;
    detail: (item: OutstandingItem) => string;
  }
> = {
  "purchase-payables": {
    title: "Purchase payables",
    description: "Outstanding amounts owed to vehicle vendors.",
    emptyTitle: "No purchase payables",
    emptyDescription:
      "Settled vendor balances will drop off this list automatically.",
    query: operationsApi.purchases.payables,
    detail: (item) => `/purchase/purchases/${item.purchaseId}`,
  },
  "purchase-return-receivables": {
    title: "Purchase-return receivables",
    description: "Refunds still due from vendors.",
    emptyTitle: "No purchase-return receivables",
    emptyDescription:
      "Settled vendor refunds will drop off this list automatically.",
    query: operationsApi.purchaseReturns.receivables,
    detail: (item) => `/purchase/returns/${item.purchaseReturnId}`,
  },
  "sale-return-payables": {
    title: "Sale-return payables",
    description: "Refund balances still owed to customers.",
    emptyTitle: "No sale-return payables",
    emptyDescription:
      "Settled customer refunds will drop off this list automatically.",
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
            emptyMessage={itemConfig.emptyTitle}
            emptyDescription={itemConfig.emptyDescription}
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
export const SalesReceivablesRoute = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReceivablesTab>("customers");
  const customers = useQuery({
    queryKey: ["operations", "outstanding", "sales-receivables"],
    queryFn: operationsApi.sales.receivables,
  });
  const finance = useQuery({
    queryKey: ["operations", "outstanding", "sales-receivables", "finance"],
    queryFn: operationsApi.sales.financeReceivables,
  });
  return (
    <>
      <PageHeader
        title="Sales receivables"
        description="Follow up with customers and finance companies separately — a financed sale can leave a balance on either side."
      />
      <QueryBoundary
        pending={customers.isPending}
        error={customers.error}
        retry={() => void customers.refetch()}
      >
        <div className="operations-kpis">
          <StatCard
            label="Total outstanding"
            value={formatCurrency(customers.data?.totalOutstandingAmount)}
          />
          <StatCard
            label="Customer pending"
            value={formatCurrency(customers.data?.totalPendingAmount)}
          />
          <StatCard
            label="Finance pending"
            value={formatCurrency(customers.data?.financePendingAmount)}
          />
          <StatCard
            label={tab === "customers" ? "Open invoices" : "Finance companies"}
            value={
              tab === "customers"
                ? (customers.data?.totalCount ?? 0)
                : (finance.data?.totalCount ?? 0)
            }
          />
        </div>
        <div
          className="operations-tabs"
          role="tablist"
          aria-label="Receivables"
        >
          <Button
            role="tab"
            aria-selected={tab === "customers"}
            variant={tab === "customers" ? "primary" : "secondary"}
            onClick={() => setTab("customers")}
          >
            Customers
          </Button>
          <Button
            role="tab"
            aria-selected={tab === "finance"}
            variant={tab === "finance" ? "primary" : "secondary"}
            onClick={() => setTab("finance")}
          >
            Finance Companies
          </Button>
        </div>
        {tab === "customers" ? (
          <Card>
            <DataTable
              caption="Customer receivables"
              rows={customers.data?.items ?? []}
              emptyMessage="No customer receivables"
              emptyDescription="Settled customer balances will drop off this list automatically."
              onRowClick={(row) => navigate(`/sales/sales/${row.saleId}`)}
              rowKey={(row) => String(row.saleId)}
              columns={[
                {
                  key: "reference",
                  header: "Reference",
                  cell: (row) => <strong>{row.invoiceNo ?? "View"}</strong>,
                },
                {
                  key: "vehicle",
                  header: "Vehicle",
                  cell: (row) => row.vehicleNo,
                },
                {
                  key: "party",
                  header: "Customer",
                  cell: (row) => row.customerName ?? "—",
                },
                {
                  key: "mobile",
                  header: "Mobile",
                  cell: (row) => row.customerMobile ?? "—",
                },
                {
                  key: "date",
                  header: "Sale date",
                  cell: (row) => formatDate(row.saleDate),
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
                {
                  key: "last",
                  header: "Last payment",
                  cell: (row) => formatDate(row.lastPaymentDate),
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
        ) : (
          <QueryBoundary
            pending={finance.isPending}
            error={finance.error}
            retry={() => void finance.refetch()}
          >
            <FinanceCompaniesTable items={finance.data?.items ?? []} />
          </QueryBoundary>
        )}
      </QueryBoundary>
    </>
  );
};

const FinanceCompaniesTable = ({
  items,
}: {
  items: FinanceReceivableCompany[];
}) => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  if (!items.length) {
    return (
      <EmptyState
        title="No finance-company receivables"
        description="Pending disbursements will appear here so you can follow up with the finance company."
      />
    );
  }
  const toggle = (id: number) =>
    setExpandedId((current) => (current === id ? null : id));
  return (
    <Card>
      <div className="table-wrap">
        <table className="data-table">
          <caption className="sr-only">Finance company receivables</caption>
          <thead>
            <tr>
              <th className="operations-expand-toggle">
                <span className="sr-only">Expand</span>
              </th>
              <th>Finance company</th>
              <th>Contact</th>
              <th>Open sales</th>
              <th style={{ textAlign: "right" }}>Pending</th>
            </tr>
          </thead>
          <tbody>
            {items.map((company) => {
              const expanded = expandedId === company.financeCompanyId;
              return (
                <Fragment key={company.financeCompanyId}>
                  <tr
                    className="data-table__clickable-row"
                    tabIndex={0}
                    aria-expanded={expanded}
                    onClick={() => toggle(company.financeCompanyId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle(company.financeCompanyId);
                      }
                    }}
                  >
                    <td className="operations-expand-toggle">
                      {expanded ? (
                        <ChevronDown size={16} aria-hidden="true" />
                      ) : (
                        <ChevronRight size={16} aria-hidden="true" />
                      )}
                    </td>
                    <td>
                      <strong>{company.financeCompanyName}</strong>
                    </td>
                    <td>{company.contactNumber ?? "—"}</td>
                    <td>{company.sales.length}</td>
                    <td style={{ textAlign: "right" }}>
                      {formatCurrency(company.totalPending)}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="operations-expand-row">
                      <td colSpan={5}>
                        <DataTable
                          caption={`Sales pending from ${company.financeCompanyName}`}
                          rows={company.sales}
                          emptyMessage="No pending sales"
                          emptyDescription="Settled finance disbursements will drop off this list automatically."
                          rowKey={(row) => String(row.saleId)}
                          onRowClick={(row) =>
                            navigate(`/sales/sales/${row.saleId}`)
                          }
                          columns={[
                            {
                              key: "invoice",
                              header: "Invoice",
                              cell: (row) => (
                                <strong>{row.invoiceNo ?? "View"}</strong>
                              ),
                            },
                            {
                              key: "vehicle",
                              header: "Vehicle",
                              cell: (row) => row.vehicleNo,
                            },
                            {
                              key: "customer",
                              header: "Customer",
                              cell: (row) => row.customerName ?? "—",
                            },
                            {
                              key: "date",
                              header: "Sale date",
                              cell: (row) => formatDate(row.saleDate),
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
                            {
                              key: "finance",
                              header: "Finance amount",
                              align: "right",
                              cell: (row) => formatCurrency(row.financeAmount),
                            },
                            {
                              key: "pending",
                              header: "Pending",
                              align: "right",
                              cell: (row) => formatCurrency(row.pendingAmount),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
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
