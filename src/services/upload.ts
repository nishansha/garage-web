import {
  ATTACHMENT_MISSING_CODE,
  ATTACHMENT_MISSING_MESSAGE,
  ATTACHMENT_REJECTED_MESSAGE,
  ApiError,
  api,
} from "../lib/api";

/** Spring's default multipart cap until the API publishes its own limits. */
export const MAX_ATTACHMENT_BYTES = 1024 * 1024;

export const INVENTORY_PHOTO = {
  entityType: "INVENTORY",
  category: "PHOTO",
} as const;

export const VENDOR_ID_PROOF = {
  entityType: "VENDOR",
  category: "ID_PROOF",
} as const;

export const EXPENSE_RECEIPT = {
  entityType: "EXPENSE",
  category: "RECEIPT",
} as const;

export type AttachmentEntityType =
  | typeof INVENTORY_PHOTO.entityType
  | typeof VENDOR_ID_PROOF.entityType
  | typeof EXPENSE_RECEIPT.entityType
  | (string & {});

export type AttachmentCategory =
  | typeof INVENTORY_PHOTO.category
  | typeof VENDOR_ID_PROOF.category
  | typeof EXPENSE_RECEIPT.category
  | (string & {});

export interface AttachmentScope {
  entityType: string;
  entityId: number;
  category: string;
}

export interface Attachment {
  id: number;
  fileName: string;
  contentType: string;
  category: string;
  fileSize: number;
  createdAt: string;
  downloadUrl: string;
}

export interface AttachmentUploadResult {
  attachments: Attachment[];
}

const SIZE_REJECTED_PATTERN =
  /maximum upload size|max.?upload|file size|too large|multipart.*size|size exceeded/i;

const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : "";
};

export const attachmentQueryKey = (scope: AttachmentScope) =>
  ["attachments", scope.entityType, scope.entityId, scope.category] as const;

export const attachmentBlobQueryKey = (id: number) =>
  ["attachments", "blob", id] as const;

export const isOversizedAttachment = (file: Pick<File, "size">) =>
  file.size > MAX_ATTACHMENT_BYTES;

export const oversizedAttachmentMessage = (
  fileNames: ReadonlyArray<string>,
) => {
  if (fileNames.length === 1) {
    return `"${fileNames[0]}" is larger than 1 MB. Each file must be under 1 MB.`;
  }
  return `${fileNames.length} files are larger than 1 MB. Each file must be under 1 MB.`;
};

export const attachmentErrorMessage = (error: unknown): string | null => {
  if (!(error instanceof ApiError)) return null;
  if (error.code === ATTACHMENT_MISSING_CODE) return ATTACHMENT_MISSING_MESSAGE;
  if (error.status === 413) return ATTACHMENT_REJECTED_MESSAGE;
  if (SIZE_REJECTED_PATTERN.test(error.message)) {
    return ATTACHMENT_REJECTED_MESSAGE;
  }
  return null;
};

export const acceptForCategory = (category: string) => {
  if (category === INVENTORY_PHOTO.category) return "image/*";
  if (
    category === VENDOR_ID_PROOF.category ||
    category === EXPENSE_RECEIPT.category
  ) {
    return "image/*,.pdf,application/pdf";
  }
  return undefined;
};

export const matchesAccept = (file: File, accept?: string) => {
  if (!accept || accept === "*/*") return true;
  return accept.split(",").some((part) => {
    const value = part.trim();
    if (!value) return false;
    if (value.endsWith("/*")) {
      return file.type.startsWith(value.slice(0, -1));
    }
    if (value.startsWith(".")) {
      return file.name.toLowerCase().endsWith(value.toLowerCase());
    }
    return file.type === value;
  });
};

export const uploadApi = {
  list: (scope: AttachmentScope) =>
    api.get<Attachment[]>(
      `v1/upload${query({
        entityType: scope.entityType,
        entityId: scope.entityId,
        category: scope.category,
      })}`,
    ),
  create: (scope: AttachmentScope, files: ReadonlyArray<File>) => {
    const body = new FormData();
    body.append("entityType", scope.entityType);
    body.append("entityId", String(scope.entityId));
    body.append("category", scope.category);
    for (const file of files) body.append("files", file);
    return api.postForm<AttachmentUploadResult>("v1/upload", body);
  },
  download: (id: number) => api.getBlob(`v1/upload/${id}/download`),
};
