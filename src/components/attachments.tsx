import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Image, ImagePlus, Upload, X } from "lucide-react";
import { useAttachmentObjectUrl } from "../hooks/useAttachmentObjectUrl";
import { ApiError } from "../lib/api";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "../lib/rbac";
import { cx } from "../lib/utils";
import {
  acceptForCategory,
  attachmentErrorMessage,
  attachmentQueryKey,
  isOversizedAttachment,
  matchesAccept,
  oversizedAttachmentMessage,
  uploadApi,
  type Attachment,
  type AttachmentScope,
} from "../services/upload";
import { Button, Modal, Spinner } from "./ui";

type SelectedFile = {
  id: string;
  file: File;
  previewUrl?: string;
};

const fileKey = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}`;

const revokePreviews = (files: ReadonlyArray<SelectedFile>) => {
  for (const item of files) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }
};

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const isImageContent = (value: string) => value.startsWith("image/");

export const AttachmentImage = ({
  attachment,
  className,
}: {
  attachment: Attachment;
  className?: string;
}) => {
  const { url, query } = useAttachmentObjectUrl(attachment.id);
  if (query.isPending) {
    return (
      <div
        className={cx("attachment-image attachment-image--pending", className)}
      >
        <Spinner size="sm" label={`Loading ${attachment.fileName}`} />
      </div>
    );
  }
  if (!url) {
    return (
      <div
        className={cx("attachment-image attachment-image--missing", className)}
      >
        <Image aria-hidden="true" />
        <span>Unavailable</span>
      </div>
    );
  }
  return <img className={className} src={url} alt={attachment.fileName} />;
};

const EMPTY_ATTACHMENTS: Attachment[] = [];

export const AttachmentGallery = ({
  entityType,
  entityId,
  category,
  emptyLabel = "Files",
  uploadLabel = "Upload",
  onUpload,
}: AttachmentScope & {
  emptyLabel?: string;
  uploadLabel?: string;
  onUpload?: () => void;
}) => {
  const [selectedId, setSelectedId] = useState<number>();
  const query = useQuery({
    queryKey: attachmentQueryKey({ entityType, entityId, category }),
    queryFn: () => uploadApi.list({ entityType, entityId, category }),
    enabled: entityId > 0,
  });
  const attachments = query.data ?? EMPTY_ATTACHMENTS;
  const selected =
    attachments.find((item) => item.id === selectedId) ?? attachments[0];

  useEffect(() => {
    if (
      selectedId != null &&
      attachments.some((item) => item.id === selectedId)
    ) {
      return;
    }
    setSelectedId(attachments[0]?.id);
  }, [attachments, selectedId]);

  if (query.isPending) {
    return (
      <div className="attachment-gallery attachment-gallery--empty">
        <Spinner size="lg" label="Loading files" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="attachment-gallery attachment-gallery--empty">
        <Image aria-hidden="true" />
        <span>Unable to load files</span>
        {onUpload && (
          <Button type="button" variant="secondary" onClick={onUpload}>
            {uploadLabel}
          </Button>
        )}
      </div>
    );
  }

  if (!attachments.length) {
    return (
      <div className="attachment-gallery attachment-gallery--empty">
        <Image aria-hidden="true" />
        <span>{emptyLabel}</span>
        {onUpload && (
          <Button type="button" variant="secondary" onClick={onUpload}>
            {uploadLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="attachment-gallery attachment-gallery--filled">
      <div className="attachment-gallery__stage">
        {selected && isImageContent(selected.contentType) ? (
          <AttachmentImage attachment={selected} />
        ) : (
          <div className="attachment-gallery__file">
            <FileText aria-hidden="true" />
            <span>{selected?.fileName}</span>
          </div>
        )}
        {onUpload && (
          <Button
            type="button"
            variant="secondary"
            className="attachment-gallery__upload"
            onClick={onUpload}
          >
            {uploadLabel}
          </Button>
        )}
      </div>
      {attachments.length > 1 && (
        <ul className="attachment-gallery__thumbs">
          {attachments.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cx(
                  "attachment-gallery__thumb",
                  item.id === selected?.id && "is-active",
                )}
                aria-label={item.fileName}
                aria-current={item.id === selected?.id}
                onClick={() => setSelectedId(item.id)}
              >
                {isImageContent(item.contentType) ? (
                  <AttachmentImage attachment={item} />
                ) : (
                  <FileText aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const AttachmentUploadButton = ({
  label = "Upload",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) => (
  <Button type="button" variant="secondary" onClick={onClick}>
    <ImagePlus aria-hidden="true" />
    {label}
  </Button>
);

export const AttachmentUploadModal = ({
  entityType,
  entityId,
  category,
  open,
  onClose,
  title = "Upload files",
  accept,
  hint = "Click or drop files here. Each file must be under 1 MB.",
  submitLabel = "Submit",
  successLabel,
}: AttachmentScope & {
  open: boolean;
  onClose: () => void;
  title?: string;
  accept?: string;
  hint?: string;
  submitLabel?: string;
  successLabel?: (count: number) => string;
}) => {
  const client = useQueryClient();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<SelectedFile[]>([]);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const resolvedAccept = accept ?? acceptForCategory(category);

  filesRef.current = files;

  const resetSelection = () => {
    revokePreviews(filesRef.current);
    filesRef.current = [];
    setFiles([]);
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const wasOpen = useRef(open);

  useEffect(() => () => revokePreviews(filesRef.current), []);

  useEffect(() => {
    if (wasOpen.current && !open) resetSelection();
    wasOpen.current = open;
  }, [open]);

  const addFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const accepted = incoming.filter((file) =>
      matchesAccept(file, resolvedAccept),
    );
    const oversized = accepted.filter(isOversizedAttachment);
    const usable = accepted.filter((file) => !isOversizedAttachment(file));

    if (!incoming.length) return;
    if (!accepted.length) {
      toast.error("Choose a supported file type.");
      return;
    }
    if (oversized.length) {
      toast.error(
        oversizedAttachmentMessage(oversized.map((file) => file.name)),
      );
    }
    if (!usable.length) return;

    setFiles((current) => {
      const existing = new Set(current.map((item) => fileKey(item.file)));
      const added = usable
        .filter((file) => !existing.has(fileKey(file)))
        .map((file) => ({
          id: `${fileKey(file)}:${crypto.randomUUID()}`,
          file,
          previewUrl: isImageContent(file.type)
            ? URL.createObjectURL(file)
            : undefined,
        }));
      if (!added.length) return current;
      return [...current, ...added];
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((current) => {
      const next = current.filter((item) => item.id !== id);
      const removed = current.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const upload = useMutation({
    mutationFn: () =>
      uploadApi.create(
        { entityType, entityId, category },
        filesRef.current.map((item) => item.file),
      ),
    onSuccess: (result) => {
      void client.invalidateQueries({
        queryKey: attachmentQueryKey({ entityType, entityId, category }),
      });
      const count = result.attachments?.length || filesRef.current.length;
      toast.success(
        successLabel?.(count) ??
          (count === 1 ? "File uploaded" : "Files uploaded"),
      );
      onClose();
    },
    onError: (error) => {
      const rejection = attachmentErrorMessage(error);
      if (rejection) {
        toast.error(rejection);
        return;
      }
      toast.error(
        isForbiddenError(error)
          ? FORBIDDEN_MESSAGE
          : error instanceof ApiError || error instanceof Error
            ? error.message
            : "Unable to upload the file.",
      );
    },
  });

  const close = () => {
    if (!upload.isPending) onClose();
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={close}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={upload.isPending}
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            type="button"
            loading={upload.isPending}
            disabled={!files.length}
            onClick={() => upload.mutate()}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="attachment-upload">
        <label
          htmlFor={inputId}
          className={cx(
            "attachment-upload__dropzone",
            dragging && "is-dragging",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <Upload aria-hidden="true" />
          <strong>Select files</strong>
          <span>{hint}</span>
          <input
            ref={inputRef}
            id={inputId}
            className="sr-only"
            type="file"
            accept={resolvedAccept}
            multiple
            disabled={upload.isPending}
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
            }}
          />
        </label>

        {files.length > 0 && (
          <ul className="attachment-upload__previews">
            {files.map((item) => (
              <li key={item.id} className="attachment-upload__preview">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" />
                ) : (
                  <div className="attachment-upload__file-icon">
                    <FileText aria-hidden="true" />
                  </div>
                )}
                <div>
                  <strong>{item.file.name}</strong>
                  <small>{formatBytes(item.file.size)}</small>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${item.file.name}`}
                  disabled={upload.isPending}
                  onClick={() => removeFile(item.id)}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};
