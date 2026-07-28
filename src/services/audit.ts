import { api } from "../lib/api";

export const AUDIT_ENTITY_TYPES = [
  "sale",
  "purchase",
  "sale-payment",
  "purchase-payment",
  "sale-refund-payment",
  "purchase-return-receipt",
  "sale-return",
  "purchase-return",
  "sale-return-deduction",
  "direct-entry",
  "other-income",
  "expense",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
export type AuditSnapshot = Record<string, unknown>;
export type AuditChangeType = "ADD" | "MOD" | "DEL";

export interface AuditFieldChange {
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditRevision {
  revision: number;
  changeType: AuditChangeType;
  userId: number | null;
  username: string | null;
  revisionAt: string;
  entity: AuditSnapshot | null;
  changedFields: Record<string, AuditFieldChange> | null;
}

export interface DeletedAuditRecord {
  id: number;
  revision: number;
  deletedBy: number | null;
  deletedByName: string | null;
  deletedAt: string;
  entity: AuditSnapshot;
}

const path = (entityType: AuditEntityType) =>
  `v1/audit/${encodeURIComponent(entityType)}`;

export const auditApi = {
  history: (entityType: AuditEntityType, id: number) =>
    api.get<AuditRevision[]>(
      `${path(entityType)}/${encodeURIComponent(id)}/history`,
    ),
  async snapshot(
    entityType: AuditEntityType,
    id: number,
    revision: number,
  ): Promise<AuditSnapshot | null> {
    const snapshot = await api.get<AuditSnapshot | null | undefined>(
      `${path(entityType)}/${encodeURIComponent(id)}/revisions/${encodeURIComponent(revision)}`,
    );
    return snapshot ?? null;
  },
  deleted: (entityType: AuditEntityType) =>
    api.get<DeletedAuditRecord[]>(`${path(entityType)}/deleted`),
};
