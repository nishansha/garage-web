import { format, isValid, parse, parseISO } from "date-fns";

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
  const date = parseDateValue(value);
  return date ? format(date, pattern) : "—";
};

const DATE_DISPLAY_FORMATS = [
  "MM-yyyy, hh:mm a",
  "dd-MM-yyyy, hh:mm a",
  "dd-MM-yyyy, hh:mm:ss a",
  "yyyy-MM-dd HH:mm:ss",
];

const parseDateValue = (
  value: string | Date | null | undefined,
): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return isValid(value) ? value : undefined;
  const iso = parseISO(value);
  if (isValid(iso)) return iso;
  for (const source of DATE_DISPLAY_FORMATS) {
    const parsed = parse(value.trim(), source, new Date());
    if (isValid(parsed)) return parsed;
  }
  return undefined;
};

const isMonthYearTime = (value: string) =>
  /^\d{2}-\d{4},/.test(value.trim());

/** Formats activity timestamps, including API strings like "08-2026, 12:00 AM". */
export const formatDateLabel = (
  value: string | Date | null | undefined,
  pattern = "dd MMM yyyy",
): string => {
  const date = parseDateValue(value);
  if (date) {
    if (typeof value === "string" && isMonthYearTime(value)) {
      return format(date, "MMM yyyy, h:mm a");
    }
    return format(date, pattern);
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return "—";
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
