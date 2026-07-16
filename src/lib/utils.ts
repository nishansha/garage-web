import { format, isValid, parseISO } from "date-fns";

export const cx = (
  ...values: Array<string | false | null | undefined>
): string => values.filter(Boolean).join(" ");

export const formatCurrency = (
  value: number | string | null | undefined,
  currency = "INR",
): string => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount == null || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (
  value: string | Date | null | undefined,
  pattern = "dd MMM yyyy",
): string => {
  if (!value) return "—";
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? format(date, pattern) : "—";
};

const escapeCsvCell = (value: unknown): string => {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (
  rows: ReadonlyArray<Record<string, unknown>>,
  columns?: readonly string[],
): string => {
  const headers = columns ?? Object.keys(rows[0] ?? {});
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      headers.map((key) => escapeCsvCell(row[key])).join(","),
    ),
  ].join("\r\n");
};

export const downloadCsv = (
  filename: string,
  rows: ReadonlyArray<Record<string, unknown>>,
  columns?: readonly string[],
): void => {
  const blob = new Blob([`\uFEFF${toCsv(rows, columns)}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};
