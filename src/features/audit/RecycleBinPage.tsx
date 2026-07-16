import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  DataTable,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  Select,
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import {
  AUDIT_ENTITY_TYPES,
  auditApi,
  type AuditEntityType,
  type DeletedAuditRecord,
} from "../../services/audit";
import { AuditHistoryModal } from "./AuditHistory";
import { AUDIT_ENTITY_LABELS, getDeletedRecordLabel } from "./audit-format";

const message = (error: unknown) =>
  error instanceof ApiError ? error.message : "Unable to load deleted records.";

export const RecycleBinPage = () => {
  const [entityType, setEntityType] = useState<AuditEntityType>("sale");
  const [selected, setSelected] = useState<DeletedAuditRecord | null>(null);
  const query = useQuery({
    queryKey: ["audit", "deleted", entityType],
    queryFn: () => auditApi.deleted(entityType),
  });

  return (
    <>
      <PageHeader
        title="Recycle Bin"
        description="Review deleted business records and their complete audit history."
      />
      <Card className="recycle-filters">
        <FormField label="Record type">
          <Select
            value={entityType}
            onChange={(event) => {
              setSelected(null);
              setEntityType(event.target.value as AuditEntityType);
            }}
            options={AUDIT_ENTITY_TYPES.map((value) => ({
              value,
              label: AUDIT_ENTITY_LABELS[value],
            }))}
          />
        </FormField>
      </Card>
      {query.isLoading ? (
        <LoadingState label="Loading deleted records…" />
      ) : query.isError ? (
        <ErrorState
          message={message(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Card>
          <DataTable
            caption={`Deleted ${AUDIT_ENTITY_LABELS[entityType]} records`}
            rows={query.data ?? []}
            rowKey={(record) => `${record.id}-${record.revision}`}
            emptyMessage={`No deleted ${AUDIT_ENTITY_LABELS[entityType].toLowerCase()} records.`}
            onRowClick={setSelected}
            columns={[
              {
                key: "record",
                header: "Deleted record",
                cell: (record) => (
                  <span className="recycle-label">
                    <strong>
                      {getDeletedRecordLabel(
                        entityType,
                        record.id,
                        record.entity,
                      )}
                    </strong>
                    <small>Record #{record.id}</small>
                  </span>
                ),
              },
              {
                key: "actor",
                header: "Deleted by",
                cell: (record) =>
                  record.deletedByName?.trim() || "Unknown user",
              },
              {
                key: "date",
                header: "Deleted at",
                cell: (record) =>
                  formatDate(record.deletedAt, "dd MMM yyyy, HH:mm"),
              },
              {
                key: "history",
                header: "",
                cell: (record) => (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelected(record)}
                  >
                    View history
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}
      {selected && (
        <AuditHistoryModal
          open
          entityType={entityType}
          entityId={selected.id}
          recordLabel={getDeletedRecordLabel(
            entityType,
            selected.id,
            selected.entity,
          )}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};
