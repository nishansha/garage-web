import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { cx, formatCurrency } from "../../lib/utils";
import {
  warehouseApi,
  type WarehousePerformance,
} from "../../services/warehouse";

const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const money = (value: number | null | undefined) =>
  formatCurrency(Number(value ?? 0));

const percent = (value: number | null | undefined) =>
  `${Number(value ?? 0).toFixed(1)}%`;

const countLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const displayName = (row: WarehousePerformance) =>
  row.warehouseId == null || row.warehouseCode === "UNASSIGNED"
    ? "Unassigned"
    : row.warehouseName;

const Metric = ({
  label,
  value,
  detail,
  muted,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  muted?: boolean;
}) => (
  <div className={cx("warehouse-compare-metric", muted && "is-muted")}>
    <span>{label}</span>
    <strong>{value}</strong>
    {detail != null ? <small>{detail}</small> : null}
  </div>
);

export const WarehouseComparisonPage = () => {
  const [month, setMonth] = useState(thisMonth());
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<
    number | "all"
  >("all");

  const allowedMonths = useMemo(() => {
    const current = new Date();
    return Array.from(
      { length: current.getMonth() + 1 },
      (_, index) =>
        `${current.getFullYear()}-${String(index + 1).padStart(2, "0")}`,
    );
  }, []);

  const query = useQuery({
    queryKey: ["reports", "warehouse-comparison", month],
    queryFn: () => warehouseApi.comparison(month),
  });

  const rows = useMemo(() => {
    const warehouses = query.data?.warehouses ?? [];
    if (selectedWarehouseId === "all") return warehouses;
    return warehouses.filter((row) => row.warehouseId === selectedWarehouseId);
  }, [query.data?.warehouses, selectedWarehouseId]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        stockCount: acc.stockCount + Number(row.stockCount ?? 0),
        stockValue: acc.stockValue + Number(row.stockValue ?? 0),
        salesCount: acc.salesCount + Number(row.salesCount ?? 0),
        salesRevenue: acc.salesRevenue + Number(row.salesRevenue ?? 0),
        grossProfit: acc.grossProfit + Number(row.grossProfit ?? 0),
        serviceSalesCount:
          acc.serviceSalesCount + Number(row.serviceSalesCount ?? 0),
        serviceRevenue: acc.serviceRevenue + Number(row.serviceRevenue ?? 0),
        purchaseCount: acc.purchaseCount + Number(row.purchaseCount ?? 0),
        purchaseCost: acc.purchaseCost + Number(row.purchaseCost ?? 0),
        landedCost: acc.landedCost + Number(row.landedCost ?? 0),
        purchaseExpenses:
          acc.purchaseExpenses + Number(row.purchaseExpenses ?? 0),
        payablesCount: acc.payablesCount + Number(row.payablesCount ?? 0),
        totalPayables: acc.totalPayables + Number(row.totalPayables ?? 0),
        generalExpenses:
          acc.generalExpenses + Number(row.generalExpenses ?? 0),
      }),
      {
        stockCount: 0,
        stockValue: 0,
        salesCount: 0,
        salesRevenue: 0,
        grossProfit: 0,
        serviceSalesCount: 0,
        serviceRevenue: 0,
        purchaseCount: 0,
        purchaseCost: 0,
        landedCost: 0,
        purchaseExpenses: 0,
        payablesCount: 0,
        totalPayables: 0,
        generalExpenses: 0,
      },
    );
  }, [rows]);

  const marginPct =
    totals.salesRevenue > 0
      ? (totals.grossProfit / totals.salesRevenue) * 100
      : 0;

  const selectWarehouse = (row: WarehousePerformance) => {
    if (row.warehouseId == null) {
      setSelectedWarehouseId("all");
      return;
    }
    setSelectedWarehouseId(row.warehouseId);
  };

  return (
    <>
      <PageHeader
        title="Warehouse Comparison"
        description="Compare stock, vehicle sales, service sales, purchasing, expenses, and payables across warehouses. Gross profit already reflects sold vehicles; purchasing figures are separate period activity."
      />
      <Card className="report-filters compare-filters">
        <Select
          aria-label="Warehouse"
          value={
            selectedWarehouseId === "all" ? "" : String(selectedWarehouseId)
          }
          onChange={(event) => {
            const raw = event.target.value;
            setSelectedWarehouseId(raw ? Number(raw) : "all");
          }}
        >
          <option value="">All warehouses</option>
          {(query.data?.warehouses ?? [])
            .filter((row) => row.warehouseId != null)
            .map((row) => (
              <option key={row.warehouseId!} value={row.warehouseId!}>
                {row.warehouseName}
              </option>
            ))}
        </Select>
        <div className="pl-months" role="group" aria-label="Report month">
          {allowedMonths.map((value) => {
            const date = new Date(`${value}-01T00:00:00`);
            return (
              <button
                className={month === value ? "is-active" : undefined}
                key={value}
                type="button"
                aria-pressed={month === value}
                onClick={() => {
                  setMonth(value);
                  setSelectedWarehouseId("all");
                }}
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
              : "Unable to load warehouse comparison."
          }
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className="accounting-stats accounting-stats--compact">
            <StatCard
              label="Stock"
              value={money(totals.stockValue)}
              trend={countLabel(totals.stockCount, "unit")}
            />
            <StatCard
              label="Vehicle sales"
              value={money(totals.salesRevenue)}
              trend={`${countLabel(totals.salesCount, "sale")} · ${percent(marginPct)} margin`}
            />
            <StatCard label="Gross profit" value={money(totals.grossProfit)} />
            <StatCard
              label="Service sales"
              value={money(totals.serviceRevenue)}
              trend={countLabel(totals.serviceSalesCount, "invoice")}
            />
            <div className="warehouse-comparison-secondary-stats warehouse-comparison-secondary-stats--inline">
              <StatCard
                label="Purchasing"
                value={money(totals.purchaseCost)}
                trend={`${countLabel(totals.purchaseCount, "purchase")} · Landed ${money(totals.landedCost)} · Exp. ${money(totals.purchaseExpenses)}`}
              />
              <StatCard
                label="Payables"
                value={money(totals.totalPayables)}
                trend={countLabel(
                  totals.payablesCount,
                  "open bill",
                  "open bills",
                )}
              />
              <StatCard
                label="Expenses"
                value={money(totals.generalExpenses)}
              />
            </div>
          </div>
          {rows.length === 0 ? (
            <EmptyState
              title="No warehouse performance data for this month"
              description="Warehouse results will appear here once there is activity in the selected month."
            />
          ) : (
            <div
              className="warehouse-compare-grid"
              aria-label={`Warehouse performance for ${query.data?.month ?? month}`}
            >
              {rows.map((row) => {
                const isUnassigned = row.warehouseId == null;
                const isSelected =
                  !isUnassigned && selectedWarehouseId === row.warehouseId;
                return (
                  <article
                    key={isUnassigned ? "unassigned" : String(row.warehouseId)}
                    className={cx(
                      "card warehouse-compare-card",
                      isSelected && "is-selected",
                      isUnassigned && "is-unassigned",
                    )}
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => selectWarehouse(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectWarehouse(row);
                      }
                    }}
                  >
                    <header className="warehouse-compare-card__header">
                      <div>
                        <h2>{displayName(row)}</h2>
                        <small>{row.warehouseCode}</small>
                      </div>
                    </header>
                    <div className="warehouse-compare-card__metrics">
                      <Metric
                        label="Stock"
                        value={money(row.stockValue)}
                        detail={countLabel(row.stockCount ?? 0, "unit")}
                      />
                      <Metric
                        label="Vehicle sales"
                        value={money(row.salesRevenue)}
                        detail={`${countLabel(row.salesCount ?? 0, "sale")} · GP ${money(row.grossProfit)} · ${percent(row.grossMarginPct)}`}
                      />
                      <Metric
                        label="Service sales"
                        value={money(row.serviceRevenue)}
                        detail={countLabel(
                          row.serviceSalesCount ?? 0,
                          "invoice",
                        )}
                      />
                      <Metric
                        label="Payables"
                        value={money(row.totalPayables)}
                        detail={`${countLabel(row.payablesCount ?? 0, "open bill", "open bills")}`}
                        muted
                      />
                      <Metric
                        label="Purchasing"
                        value={money(row.purchaseCost)}
                        detail={`${countLabel(row.purchaseCount ?? 0, "purchase")} · Landed ${money(row.landedCost)} · Exp. ${money(row.purchaseExpenses)}`}
                        muted
                      />
                      <Metric
                        label="Expenses"
                        value={money(row.generalExpenses)}
                        muted
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <Card className="warehouse-comparison-overhead">
            <div className="report-row">
              <span>
                Company overhead — not attributed to any warehouse
                <small className="cell-subtitle">
                  Unallocated general expenses (rent, salaries, and similar)
                </small>
              </span>
              <strong>
                {money(query.data?.unallocatedGeneralExpenses ?? 0)}
              </strong>
            </div>
          </Card>
        </>
      )}
    </>
  );
};
