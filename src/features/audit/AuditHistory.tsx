import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History as HistoryIcon } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
} from "../../components/ui";
import { Can } from "../../components/Can";
import { ApiError } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import {
  auditApi,
  type AuditChangeType,
  type AuditEntityType,
  type AuditRevision,
} from "../../services/audit";
import {
  AUDIT_ENTITY_LABELS,
  formatAuditValue,
  humanizeAuditKey,
  isVisibleAuditField,
  visibleSnapshotEntries,
} from "./audit-format";
import "./audit.css";

const changePresentation: Record<
  AuditChangeType,
  { label: string; tone: "success" | "info" | "danger" }
> = {
  ADD: { label: "Created", tone: "success" },
  MOD: { label: "Updated", tone: "info" },
  DEL: { label: "Deleted", tone: "danger" },
};

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : "Unable to load audit history.";

const SnapshotDetails = ({
  entityType,
  entityId,
  revision,
}: {
  entityType: AuditEntityType;
  entityId: number;
  revision: number;
}) => {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["audit", entityType, entityId, "revision", revision],
    queryFn: () => auditApi.snapshot(entityType, entityId, revision),
    enabled: open,
  });

  return (
    <details
      className="audit-snapshot"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>View full state at this point</summary>
      {query.isLoading ? (
        <LoadingState label="Loading snapshot…" />
      ) : query.isError ? (
        <ErrorState
          message={errorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : query.data ? (
        <dl className="audit-field-grid">
          {visibleSnapshotEntries(query.data).map(([key, value]) => (
            <div key={key}>
              <dt>{humanizeAuditKey(key)}</dt>
              <dd>{formatAuditValue(key, value)}</dd>
            </div>
          ))}
        </dl>
      ) : open && !query.isFetching ? (
        <p className="audit-note">No state is available at this revision.</p>
      ) : null}
    </details>
  );
};

const ChangedFields = ({ revision }: { revision: AuditRevision }) => {
  if (revision.changeType === "ADD")
    return <p className="audit-note">Initial record state created.</p>;

  const changes = Object.entries(revision.changedFields ?? {}).filter(([key]) =>
    isVisibleAuditField(key),
  );
  if (!changes.length)
    return (
      <p className="audit-note">
        {revision.changeType === "DEL"
          ? "Deleted — no field changes."
          : "No business-field changes recorded."}
      </p>
    );

  return (
    <dl className="audit-changes">
      {changes.map(([key, change]) => (
        <div key={key}>
          <dt>{humanizeAuditKey(key)}</dt>
          <dd>
            <span>{formatAuditValue(key, change.oldValue)}</span>
            <span aria-hidden="true">→</span>
            <strong>{formatAuditValue(key, change.newValue)}</strong>
          </dd>
        </div>
      ))}
    </dl>
  );
};

export const AuditHistory = ({
  entityType,
  entityId,
}: {
  entityType: AuditEntityType;
  entityId: number;
}) => {
  const query = useQuery({
    queryKey: ["audit", entityType, entityId, "history"],
    queryFn: () => auditApi.history(entityType, entityId),
  });

  if (query.isLoading) return <LoadingState label="Loading history…" />;
  if (query.isError)
    return (
      <ErrorState
        message={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data?.length)
    return (
      <EmptyState
        title="No history"
        description="No audit revisions were found for this record."
      />
    );

  return (
    <ol className="audit-timeline">
      {[...query.data].reverse().map((revision) => {
        const presentation = changePresentation[revision.changeType];
        return (
          <li key={revision.revision}>
            <article className="audit-revision">
              <header>
                <Badge tone={presentation.tone}>{presentation.label}</Badge>
                <div>
                  <strong>{revision.username?.trim() || "Unknown user"}</strong>
                  <time dateTime={revision.revisionAt}>
                    {formatDate(revision.revisionAt, "dd MMM yyyy, HH:mm")}
                  </time>
                </div>
                <small>Revision {revision.revision}</small>
              </header>
              <ChangedFields revision={revision} />
              <SnapshotDetails
                entityType={entityType}
                entityId={entityId}
                revision={revision.revision}
              />
            </article>
          </li>
        );
      })}
    </ol>
  );
};

export const AuditHistoryModal = ({
  open,
  entityType,
  entityId,
  recordLabel,
  onClose,
}: {
  open: boolean;
  entityType: AuditEntityType;
  entityId: number;
  recordLabel?: string;
  onClose: () => void;
}) => (
  <Modal
    open={open}
    title={`${AUDIT_ENTITY_LABELS[entityType]} History${recordLabel ? ` · ${recordLabel}` : ""}`}
    onClose={onClose}
  >
    <div className="audit-history">
      <AuditHistory entityType={entityType} entityId={entityId} />
    </div>
  </Modal>
);

export const AuditHistoryButton = ({
  entityType,
  entityId,
  recordLabel,
  variant = "secondary",
}: {
  entityType: AuditEntityType;
  entityId: number;
  recordLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Can resource="AUDIT" privilege="VIEW">
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        <HistoryIcon size={16} /> History
      </Button>
      <AuditHistoryModal
        open={open}
        entityType={entityType}
        entityId={entityId}
        recordLabel={recordLabel}
        onClose={() => setOpen(false)}
      />
    </Can>
  );
};
