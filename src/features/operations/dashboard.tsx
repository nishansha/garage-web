import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Plus,
  Receipt,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, PageHeader, Select } from "../../components/ui";
import { Can } from "../../components/Can";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  operationsApi,
  type DashboardActivity,
} from "../../services/operations";
import { QueryBoundary } from "./common";

const number = (value: string | number | null | undefined) =>
  Number(value ?? 0);

const ratio = (value: number, total: number) =>
  total ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";

const DashboardKpi = ({
  label,
  value,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  delta: number;
  icon: LucideIcon;
  tone: "sales" | "purchases" | "expenses" | "profit";
}) => {
  const isPositive = delta >= 0;
  const DeltaIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className={`dashboard-kpi dashboard-kpi--${tone}`}>
      <div className="dashboard-kpi__top">
        <span className="dashboard-kpi__icon">
          <Icon size={19} aria-hidden="true" />
        </span>
        <span
          className={`dashboard-kpi__delta ${
            isPositive ? "is-positive" : "is-negative"
          }`}
        >
          <DeltaIcon size={14} aria-hidden="true" />
          {Math.abs(delta).toFixed(1)}%
        </span>
      </div>
      <span className="dashboard-kpi__label">{label}</span>
      <strong className="dashboard-kpi__value">{value}</strong>
      <small>Change from previous period</small>
    </Card>
  );
};

const MetricRow = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="dashboard-metric-row">
    <div>
      <span>{label}</span>
      <small>{detail}</small>
    </div>
    <strong>{value}</strong>
  </div>
);

const tooltipStyle = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius)",
};

const activityPresentation: Record<
  DashboardActivity["activityType"],
  {
    label: string;
    icon: LucideIcon;
    tone: "success" | "info" | "warning";
  }
> = {
  SALE: { label: "Sale", icon: CircleDollarSign, tone: "success" },
  PURCHASE: { label: "Purchase", icon: ShoppingCart, tone: "info" },
  EXPENSE: { label: "Expense", icon: Receipt, tone: "warning" },
};

export const DashboardRoute = () => {
  const [months, setMonths] = useState(6);
  const [chartType, setChartType] = useState<"SALE" | "PROFIT">("SALE");
  const summary = useQuery({
    queryKey: ["operations", "dashboard", "summary"],
    queryFn: operationsApi.dashboard.summary,
  });
  const overview = useQuery({
    queryKey: ["operations", "dashboard", "overview", months],
    queryFn: () => operationsApi.dashboard.overview(months),
  });
  const chart = useQuery({
    queryKey: ["operations", "dashboard", "chart", chartType],
    queryFn: () => operationsApi.dashboard.charts(chartType),
  });
  const activities = useQuery({
    queryKey: ["operations", "dashboard", "activities"],
    queryFn: operationsApi.dashboard.activities,
  });
  const topProducts = useMemo(
    () =>
      (chart.data?.topProducts ?? []).map((item) => ({
        ...item,
        value: Number(item.value),
      })),
    [chart.data],
  );
  const sales = number(summary.data?.totalSales);
  const expenses = number(summary.data?.totalExpenses);
  const profit = number(summary.data?.totalProfit);
  const cogs = number(summary.data?.totalCogs);

  return (
    <div className="dashboard">
      <PageHeader
        title="Dashboard"
        description={`Business overview · ${formatDate(
          new Date(),
          "EEEE, dd MMMM yyyy",
        )}`}
        actions={
          <div className="dashboard-quick-actions">
            <Can resource="PURCHASE_ORDER" privilege="CREATE">
              <Link
                className="button button--secondary"
                to="/purchase/purchases/new"
              >
                <Plus size={16} aria-hidden="true" /> Purchase
              </Link>
            </Can>
            <Can resource="EXPENSE_GENERAL" privilege="CREATE">
              <Link
                className="button button--secondary"
                to="/expenses/general/new"
              >
                <Plus size={16} aria-hidden="true" /> Expense
              </Link>
            </Can>
            <Can resource="SALE" privilege="CREATE">
              <Link className="button button--secondary" to="/sales/sales/new">
                <Plus size={16} aria-hidden="true" /> Sale
              </Link>
            </Can>
            <Can resource="SERVICE_SALE" privilege="CREATE">
              <Link
                className="button button--secondary"
                to="/sales/service-sales/new"
              >
                <Plus size={16} aria-hidden="true" /> Service
              </Link>
            </Can>
          </div>
        }
      />

      <QueryBoundary
        pending={summary.isPending}
        error={summary.error}
        retry={() => void summary.refetch()}
      >
        <div className="operations-kpis">
          <DashboardKpi
            label="Sales"
            value={formatCurrency(summary.data?.totalSales)}
            delta={summary.data?.salesDelta ?? 0}
            icon={CircleDollarSign}
            tone="sales"
          />
          <DashboardKpi
            label="Purchases"
            value={formatCurrency(summary.data?.totalPurchase)}
            delta={summary.data?.purchasesDelta ?? 0}
            icon={ShoppingCart}
            tone="purchases"
          />
          <DashboardKpi
            label="Expenses"
            value={formatCurrency(summary.data?.totalExpenses)}
            delta={summary.data?.expensesDelta ?? 0}
            icon={Receipt}
            tone="expenses"
          />
          <DashboardKpi
            label="Profit"
            value={formatCurrency(summary.data?.totalProfit)}
            delta={summary.data?.profitDelta ?? 0}
            icon={Banknote}
            tone="profit"
          />
        </div>
      </QueryBoundary>

      <div className="operations-dashboard-grid">
        <Card className="operations-chart operations-chart--overview">
          <header>
            <div>
              <h2>Monthly performance</h2>
              <p>Revenue, spending and profit trends</p>
            </div>
            <Select
              aria-label="Overview period"
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              options={[3, 6, 9, 12].map((value) => ({
                value: String(value),
                label: `${value} months`,
              }))}
            />
          </header>
          <div className="dashboard-chart-legend" aria-hidden="true">
            <span className="is-sales">Sales</span>
            <span className="is-purchases">Purchases</span>
            <span className="is-expenses">Expenses</span>
            <span className="is-profit">Profit</span>
          </div>
          <QueryBoundary
            pending={overview.isPending}
            error={overview.error}
            retry={() => void overview.refetch()}
          >
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={overview.data?.data ?? []}
                margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5ee0b5" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#5ee0b5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ca8ff" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6ca8ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="4 6"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  tickFormatter={(value) =>
                    Intl.NumberFormat("en-IN", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(Number(value))
                  }
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "var(--text)" }}
                />
                <Area
                  type="monotone"
                  dataKey="totalSales"
                  name="Sales"
                  stroke="#5ee0b5"
                  strokeWidth={2.5}
                  fill="url(#salesArea)"
                />
                <Area
                  type="monotone"
                  dataKey="totalPurchase"
                  name="Purchases"
                  stroke="#a78bfa"
                  strokeWidth={1.8}
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="totalExpenses"
                  name="Expenses"
                  stroke="#ff8a92"
                  strokeWidth={1.8}
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="totalProfit"
                  name="Profit"
                  stroke="#6ca8ff"
                  strokeWidth={2.2}
                  fill="url(#profitArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </QueryBoundary>
        </Card>

        <Card className="dashboard-health">
          <header>
            <div>
              <h2>Financial health</h2>
              <p>Current month ratios</p>
            </div>
            <Badge tone={profit >= 0 ? "success" : "danger"}>
              {profit >= 0 ? "Profitable" : "Loss"}
            </Badge>
          </header>
          <QueryBoundary
            pending={summary.isPending}
            error={summary.error}
            retry={() => void summary.refetch()}
          >
            <div className="dashboard-health__profit">
              <span>Net result</span>
              <strong className={profit >= 0 ? "amount-in" : "amount-out"}>
                {formatCurrency(profit)}
              </strong>
            </div>
            <MetricRow
              label="Profit margin"
              value={ratio(profit, sales)}
              detail="Profit as a share of sales"
            />
            <MetricRow
              label="Expense ratio"
              value={ratio(expenses, sales)}
              detail="Operating expenses against sales"
            />
            <MetricRow
              label="COGS ratio"
              value={ratio(cogs, sales)}
              detail="Cost of goods sold against sales"
            />
            <Link
              className="dashboard-report-link"
              to="/accounting/profit-and-loss"
            >
              Open monthly report <ArrowUpRight size={15} />
            </Link>
          </QueryBoundary>
        </Card>
      </div>

      <div className="dashboard-lower-grid">
        <Card className="operations-chart operations-chart--products">
          <header>
            <div>
              <h2>Top products</h2>
              <p>Leading models by selected metric</p>
            </div>
            <Select
              aria-label="Product metric"
              value={chartType}
              onChange={(event) =>
                setChartType(event.target.value as "SALE" | "PROFIT")
              }
              options={[
                { value: "SALE", label: "Sales" },
                { value: "PROFIT", label: "Profit" },
              ]}
            />
          </header>
          <QueryBoundary
            pending={chart.isPending}
            error={chart.error}
            retry={() => void chart.refetch()}
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="4 6"
                  horizontal={false}
                />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={105}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-hover)" }}
                  formatter={(value) =>
                    chartType === "SALE"
                      ? Number(value).toLocaleString("en-IN")
                      : formatCurrency(Number(value))
                  }
                  contentStyle={tooltipStyle}
                />
                <Bar
                  dataKey="value"
                  fill="#5ee0b5"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={28}
                  name={chartType === "SALE" ? "Sales" : "Profit"}
                />
              </BarChart>
            </ResponsiveContainer>
          </QueryBoundary>
        </Card>

        <Card className="operations-activities">
          <header>
            <div>
              <h2>Recent activity</h2>
              <p>Latest business transactions</p>
            </div>
            <Badge>
              {activities.data?.activities.length ?? 0}{" "}
              {activities.data?.activities.length === 1 ? "entry" : "entries"}
            </Badge>
          </header>
          <QueryBoundary
            pending={activities.isPending}
            error={activities.error}
            retry={() => void activities.refetch()}
          >
            {!activities.data?.activities.length ? (
              <p className="dashboard-empty">No recent activity.</p>
            ) : (
              <ol>
                {activities.data.activities.map((activity, index) => {
                  const presentation =
                    activityPresentation[activity.activityType];
                  const ActivityIcon = presentation.icon;
                  return (
                    <li key={`${activity.dateTime}-${index}`}>
                      <span
                        className={`dashboard-activity-icon dashboard-activity-icon--${activity.activityType.toLowerCase()}`}
                      >
                        <ActivityIcon size={17} aria-hidden="true" />
                      </span>
                      <div className="dashboard-activity-content">
                        <div className="dashboard-activity-title">
                          <strong>{activity.description}</strong>
                          <Badge tone={presentation.tone}>
                            {presentation.label}
                          </Badge>
                        </div>
                        <small>
                          <time dateTime={activity.dateTime}>
                            {formatDate(
                              activity.dateTime,
                              "dd MMM yyyy, HH:mm",
                            )}
                          </time>
                        </small>
                      </div>
                      <div
                        className={`dashboard-activity-amount ${
                          activity.txnType === "C" ? "amount-in" : "amount-out"
                        }`}
                      >
                        <strong>{formatCurrency(activity.txnAmount)}</strong>
                        <small>
                          {activity.txnType === "C" ? "Credit" : "Debit"}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </QueryBoundary>
        </Card>
      </div>
    </div>
  );
};
