import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ATTACHMENT_MISSING_CODE, ApiError } from "../lib/api";
import { attachmentBlobQueryKey, uploadApi } from "../services/upload";

export const useAttachmentObjectUrl = (id: number | undefined) => {
  const query = useQuery({
    queryKey: attachmentBlobQueryKey(id ?? 0),
    queryFn: () => uploadApi.download(id!),
    enabled: id != null && id > 0,
    staleTime: Infinity,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.code === ATTACHMENT_MISSING_CODE) &&
      failureCount < 2,
  });
  const url = useMemo(
    () => (query.data ? URL.createObjectURL(query.data) : undefined),
    [query.data],
  );

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  return { url, query };
};
