import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  DataTable,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
  type DataColumn,
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import { companyApi, type CompanyPerformance } from "../../services/company";

const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const money = (value: number | null | undefined) =>
  formatCurrency(Number(value ?? 0));

const countLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const muted = (value: ReactNode) => <span className="muted">{value}</span>;

export const CompanyComparisonPage = () => {
  const [month, setMonth] = useState(thisMonth());

  const allowedMonths = useMemo(() => {
    const current = new Date();
    return Array.from(
      { length: current.getMonth() + 1 },
      (_, index) =>
        `${current.getFullYear()}-${String(index + 1).padStart(2, "0")}`,
    );
  }, []);

  const query = useQuery({
    queryKey: ["reports", "company-comparison", month],
    queryFn: () => companyApi.comparison(month),
  });

  const rows = useMemo(
    () => query.data?.companies ?? [],
    [query.data?.companies],
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        salesCount: acc.salesCount + Number(row.salesCount ?? 0),
        salesRevenue: acc.salesRevenue + Number(row.salesRevenue ?? 0),
        grossProfit: acc.grossProfit + Number(row.grossProfit ?? 0),
        purchaseCount: acc.purchaseCount + Number(row.purchaseCount ?? 0),
        purchaseCost: acc.purchaseCost + Number(row.purchaseCost ?? 0),
        serviceSaleCount:
          acc.serviceSaleCount + Number(row.serviceSaleCount ?? 0),
        serviceRevenue: acc.serviceRevenue + Number(row.serviceRevenue ?? 0),
        generalExpenses: acc.generalExpenses + Number(row.generalExpenses ?? 0),
      }),
      {
        salesCount: 0,
        salesRevenue: 0,
        grossProfit: 0,
        purchaseCount: 0,
        purchaseCost: 0,
        serviceSaleCount: 0,
        serviceRevenue: 0,
        generalExpenses: 0,
      },
    );
  }, [rows]);

  const columns: readonly DataColumn<CompanyPerformance>[] = [
    {
      key: "company",
      header: "Company",
      cell: (row) => (
        <span>
          <strong>{row.companyName}</strong>
          <small className="cell-subtitle">{row.companyCode}</small>
        </span>
      ),
    },
    {
      key: "salesCount",
      header: "Sales",
      align: "right",
      cell: (row) => row.salesCount,
    },
    {
      key: "salesRevenue",
      header: "Sales revenue",
      align: "right",
      cell: (row) => money(row.salesRevenue),
    },
    {
      key: "grossProfit",
      header: "Gross profit",
      align: "right",
      cell: (row) => money(row.grossProfit),
    },
    {
      key: "serviceSaleCount",
      header: "Service Invoice",
      align: "right",
      cell: (row) => row.serviceSaleCount,
    },
    {
      key: "serviceRevenue",
      header: "Service revenue",
      align: "right",
      cell: (row) => money(row.serviceRevenue),
    },
    {
      key: "purchaseCount",
      header: muted("Purchases"),
      align: "right",
      cell: (row) => muted(row.purchaseCount ?? 0),
    },
    {
      key: "purchaseCost",
      header: muted("Purchase cost"),
      align: "right",
      cell: (row) => muted(money(row.purchaseCost)),
    },
    {
      key: "generalExpenses",
      header: muted("Expenses"),
      align: "right",
      cell: (row) => muted(money(row.generalExpenses)),
    },
  ];

  return (
    <>
      <PageHeader
        title="Company Comparison"
        description="Compare sales, service revenue, purchasing, and expenses across companies you can access."
      />
      <Card className="report-filters compare-filters">
        <div className="pl-months" role="group" aria-label="Report month">
          {allowedMonths.map((value) => {
            const date = new Date(`${value}-01T00:00:00`);
            return (
              <button
                className={month === value ? "is-active" : undefined}
                key={value}
                type="button"
                aria-pressed={month === value}
                onClick={() => setMonth(value)}
              >
                {date.toLocaleDateString("en-IN", { month: "short" })}
              </button>
            );
          })}
        </div>
      </Card>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={
            query.error instanceof ApiError
              ? query.error.message
              : "Unable to load company comparison."
          }
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className="accounting-stats accounting-stats--compact">
            <StatCard
              label="Vehicle sales"
              value={money(totals.salesRevenue)}
              trend={countLabel(totals.salesCount, "sale")}
            />
            <StatCard label="Gross profit" value={money(totals.grossProfit)} />
            <StatCard
              label="Service sales"
              value={money(totals.serviceRevenue)}
              trend={countLabel(totals.serviceSaleCount, "invoice")}
            />
            <div className="warehouse-comparison-secondary-stats warehouse-comparison-secondary-stats--inline">
              <StatCard
                label="Purchasing"
                value={money(totals.purchaseCost)}
                trend={countLabel(totals.purchaseCount, "purchase")}
              />
              <StatCard
                label="Expenses"
                value={money(totals.generalExpenses)}
              />
            </div>
          </div>
          <Card>
            <DataTable
              caption={`Company performance for ${query.data?.month ?? month}`}
              columns={columns}
              rows={rows}
              rowKey={(row) => String(row.companyId)}
              emptyMessage="No company performance data for this month"
              emptyDescription="Company results will appear here once there is activity in the selected month."
            />
          </Card>
        </>
      )}
    </>
  );
};
