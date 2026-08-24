import { useQuery } from "@tanstack/react-query";
import {
  CircleDollarSign,
  Receipt,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { Badge, Card, Spinner } from "../../components/ui";
import { formatCurrency, formatDateLabel } from "../../lib/utils";
import {
  operationsApi,
  type DashboardActivity,
} from "../../services/operations";
import { QueryBoundary } from "./common";

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

const PANEL_LIMIT = 8;

const ActivityList = ({
  activities,
  compact,
}: {
  activities: DashboardActivity[];
  compact?: boolean;
}) => (
  <ol>
    {activities.map((activity, index) => {
      const presentation = activityPresentation[activity.activityType];
      const ActivityIcon = presentation.icon;
      return (
        <li key={`${activity.dateTime}-${index}`}>
          <span
            className={`dashboard-activity-icon dashboard-activity-icon--${activity.activityType.toLowerCase()}`}
          >
            <ActivityIcon size={compact ? 15 : 17} aria-hidden="true" />
          </span>
          <div className="dashboard-activity-content">
            <div className="dashboard-activity-title">
              <strong>{activity.description}</strong>
              {!compact && (
                <Badge tone={presentation.tone}>{presentation.label}</Badge>
              )}
            </div>
            <div className="dashboard-activity-meta">
              {compact && (
                <Badge tone={presentation.tone}>{presentation.label}</Badge>
              )}
              <time className="dashboard-activity-time">
                {formatDateLabel(activity.dateTime, "dd MMM yyyy, h:mm a")}
              </time>
            </div>
          </div>
          <div
            className={`dashboard-activity-amount ${
              activity.txnType === "C" ? "amount-in" : "amount-out"
            }`}
          >
            <strong>{formatCurrency(activity.txnAmount)}</strong>
            {!compact && (
              <small>{activity.txnType === "C" ? "Credit" : "Debit"}</small>
            )}
          </div>
        </li>
      );
    })}
  </ol>
);

export const DashboardRecentActivity = ({
  variant = "card",
}: {
  variant?: "card" | "panel";
}) => {
  const activities = useQuery({
    queryKey: ["operations", "dashboard", "activities"],
    queryFn: operationsApi.dashboard.activities,
  });
  const items = activities.data?.activities ?? [];
  const compact = variant === "panel";
  const visible = compact ? items.slice(0, PANEL_LIMIT) : items;

  if (compact) {
    return (
      <section className="right-panel" aria-label="Recent activity">
        <div className="right-panel__section">
          <h3>Recent activity</h3>
          {activities.isPending ? (
            <div className="panel-activity-status">
              <Spinner size="sm" />
              <span>Loading…</span>
            </div>
          ) : activities.error ? (
            <p className="panel-activity-status">Unable to load activity.</p>
          ) : visible.length === 0 ? (
            <p className="panel-activity-status">No recent activity.</p>
          ) : (
            <div className="operations-activities operations-activities--panel">
              <ActivityList activities={visible} compact />
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <Card className="operations-activities">
      <header>
        <div>
          <h2>Recent activity</h2>
          <p>Latest business transactions</p>
        </div>
        <Badge>
          {items.length} {items.length === 1 ? "entry" : "entries"}
        </Badge>
      </header>
      <QueryBoundary
        pending={activities.isPending}
        error={activities.error}
        retry={() => void activities.refetch()}
      >
        {!items.length ? (
          <p className="dashboard-empty">No recent activity.</p>
        ) : (
          <ActivityList activities={items} />
        )}
      </QueryBoundary>
    </Card>
  );
};
