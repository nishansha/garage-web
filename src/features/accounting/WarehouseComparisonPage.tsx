import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  DataTable,
  ErrorState,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
  type DataColumn,
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
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

const muted = (value: ReactNode) => <span className="muted">{value}</span>;

const displayName = (row: WarehousePerformance) =>
  row.warehouseId == null || row.warehouseCode === "UNASSIGNED"
    ? "Unassigned"
    : row.warehouseName;

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
    return warehouses.filter(
      (row) => row.warehouseId === selectedWarehouseId,
    );
  }, [query.data?.warehouses, selectedWarehouseId]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        stockCount: acc.stockCount + Number(row.stockCount ?? 0),
        stockValue: acc.stockValue + Number(row.stockValue ?? 0),
        salesCount: acc.salesCount + Number(row.salesCount ?? 0),
        salesRevenue: acc.salesRevenue + Number(row.salesRevenue ?? 0),
        grossProfit: acc.grossProfit + Number(row.grossProfit ?? 0),
        purchaseCount: acc.purchaseCount + Number(row.purchaseCount ?? 0),
        purchaseCost: acc.purchaseCost + Number(row.purchaseCost ?? 0),
        landedCost: acc.landedCost + Number(row.landedCost ?? 0),
        purchaseExpenses:
          acc.purchaseExpenses + Number(row.purchaseExpenses ?? 0),
        payablesCount: acc.payablesCount + Number(row.payablesCount ?? 0),
        totalPayables: acc.totalPayables + Number(row.totalPayables ?? 0),
      }),
      {
        stockCount: 0,
        stockValue: 0,
        salesCount: 0,
        salesRevenue: 0,
        grossProfit: 0,
        purchaseCount: 0,
        purchaseCost: 0,
        landedCost: 0,
        purchaseExpenses: 0,
        payablesCount: 0,
        totalPayables: 0,
      },
    );
  }, [rows]);

  const marginPct =
    totals.salesRevenue > 0
      ? (totals.grossProfit / totals.salesRevenue) * 100
      : 0;

  const columns: readonly DataColumn<WarehousePerformance>[] = [
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (row) => (
        <span>
          <strong>{displayName(row)}</strong>
          <small className="cell-subtitle">{row.warehouseCode}</small>
        </span>
      ),
    },
    {
      key: "stockCount",
      header: "Stock",
      align: "right",
      cell: (row) => row.stockCount,
    },
    {
      key: "stockValue",
      header: "Stock value",
      align: "right",
      cell: (row) => money(row.stockValue),
    },
    {
      key: "salesCount",
      header: "Sales",
      align: "right",
      cell: (row) => row.salesCount,
    },
    {
      key: "salesRevenue",
      header: "Revenue",
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
      key: "margin",
      header: "Margin",
      align: "right",
      cell: (row) => percent(row.grossMarginPct),
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
      key: "landedCost",
      header: muted("Landed cost"),
      align: "right",
      cell: (row) => muted(money(row.landedCost)),
    },
    {
      key: "purchaseExpenses",
      header: muted("Purchase exp."),
      align: "right",
      cell: (row) => muted(money(row.purchaseExpenses)),
    },
    {
      key: "payablesCount",
      header: muted("Payables #"),
      align: "right",
      cell: (row) => muted(row.payablesCount ?? 0),
    },
    {
      key: "totalPayables",
      header: muted("Payables"),
      align: "right",
      cell: (row) => muted(money(row.totalPayables)),
    },
  ];

  return (
    <>
      <PageHeader
        title="Warehouse Comparison"
        description="Compare stock, sales, purchasing, and payables across warehouses. Gross profit already reflects sold vehicles; purchasing figures are separate period activity."
      />
      <Card className="month-selector" aria-label="Report month">
        {allowedMonths.map((value) => {
          const date = new Date(`${value}-01T00:00:00`);
          return (
            <button
              className={`month-chip${month === value ? " is-active" : ""}`}
              key={value}
              type="button"
              aria-pressed={month === value}
              onClick={() => {
                setMonth(value);
                setSelectedWarehouseId("all");
              }}
            >
              <span>
                {date.toLocaleDateString("en-IN", { month: "short" })}
              </span>
              <small>'{String(date.getFullYear()).slice(-2)}</small>
            </button>
          );
        })}
      </Card>
      <Card className="report-filters">
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
          <div className="accounting-stats">
            <StatCard label="Stock units" value={totals.stockCount} />
            <StatCard label="Stock value" value={money(totals.stockValue)} />
            <StatCard label="Sales" value={totals.salesCount} />
            <StatCard label="Revenue" value={money(totals.salesRevenue)} />
            <StatCard label="Gross profit" value={money(totals.grossProfit)} />
            <StatCard label="Gross margin" value={percent(marginPct)} />
          </div>
          <div className="accounting-stats warehouse-comparison-secondary-stats">
            <StatCard
              label="Purchases this period"
              value={totals.purchaseCount}
            />
            <StatCard
              label="Purchase cost"
              value={money(totals.purchaseCost)}
            />
            <StatCard label="Landed cost" value={money(totals.landedCost)} />
            <StatCard
              label="Purchase expenses"
              value={money(totals.purchaseExpenses)}
            />
            <StatCard label="Open payables" value={totals.payablesCount} />
            <StatCard
              label="Total payables"
              value={money(totals.totalPayables)}
            />
          </div>
          <Card>
            <DataTable
              caption={`Warehouse performance for ${query.data?.month ?? month}`}
              columns={columns}
              rows={rows}
              rowKey={(row) =>
                row.warehouseId == null
                  ? "unassigned"
                  : String(row.warehouseId)
              }
              emptyMessage="No warehouse performance data for this month"
              onRowClick={(row) => {
                if (row.warehouseId == null) {
                  setSelectedWarehouseId("all");
                  return;
                }
                setSelectedWarehouseId(row.warehouseId);
              }}
            />
          </Card>
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
