import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import {
  AlertTriangle,
  Filter,
  Inbox,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { cx } from "../lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", loading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={cx("button", `button--${variant}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" label="Working" /> : children}
    </button>
  ),
);
Button.displayName = "Button";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cx("control", className)} {...props} />
));
Input.displayName = "Input";

export const DateInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, onClick, ...props }, ref) => (
  <input
    ref={ref}
    type="date"
    className={cx("control", className)}
    {...props}
    onClick={(event) => {
      onClick?.(event);
      if (!event.defaultPrevented && !props.disabled && !props.readOnly) {
        event.currentTarget.showPicker?.();
      }
    }}
  />
));
DateInput.displayName = "DateInput";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cx("control textarea", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, children, ...props }, ref) => (
    <select ref={ref} className={cx("control", className)} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export const Card = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <section className={cx("card", className)}>{children}</section>;

export const StatCard = ({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  trend?: string;
}) => (
  <Card className="stat-card">
    <div>
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
      {trend && <small>{trend}</small>}
    </div>
    {Icon && <Icon aria-hidden="true" />}
  </Card>
);

export const Badge = ({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) => <span className={cx("badge", `badge--${tone}`)}>{children}</span>;

export interface DataColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  emptyMessage,
  emptyDescription,
  onRowClick,
}: {
  columns: ReadonlyArray<DataColumn<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T) => string;
  caption: string;
  emptyMessage?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}) {
  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    !!target.closest("a, button, input, select, textarea");

  if (!rows.length) {
    return <EmptyState title={emptyMessage} description={emptyDescription} />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ textAlign: column.align }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? "data-table__clickable-row" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={(event) => {
                if (!isInteractiveTarget(event.target)) onRowClick?.(row);
              }}
              onKeyDown={(event) => {
                if (
                  onRowClick &&
                  !isInteractiveTarget(event.target) &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  onRowClick(row);
                }
              }}
            >
              {columns.map((column) => (
                <td key={column.key} style={{ textAlign: column.align }}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Pagination = ({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) => {
  if (pageCount < 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span>
        Page {page} of {pageCount}
      </span>
      <Button
        variant="secondary"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
};

export const FormField = ({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) => {
  const errorId = useId();
  const child = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{
          "aria-describedby"?: string;
          "aria-invalid"?: boolean;
        }>,
        {
          "aria-describedby": error
            ? [
                (
                  children as ReactElement<{
                    "aria-describedby"?: string;
                  }>
                ).props["aria-describedby"],
                errorId,
              ]
                .filter(Boolean)
                .join(" ")
            : (
                children as ReactElement<{
                  "aria-describedby"?: string;
                }>
              ).props["aria-describedby"],
          "aria-invalid": error ? true : undefined,
        },
      )
    : children;

  return (
    <label className="form-field">
      <span>
        {label} {required && <span aria-hidden="true">*</span>}
      </span>
      <span>{child}</span>
      {hint && !error && <small>{hint}</small>}
      {error && (
        <small className="form-error" id={errorId} role="alert">
          {error}
        </small>
      )}
    </label>
  );
};

export const SearchFilters = ({
  query,
  onQueryChange,
  children,
  actions,
  collapsible = false,
  activeFilterCount = 0,
  onClearFilters,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  children?: ReactNode;
  actions?: ReactNode;
  collapsible?: boolean;
  activeFilterCount?: number;
  onClearFilters?: () => void;
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterFieldsId = useId();
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div
      className={cx("search-filters", collapsible && "search-filters--split")}
    >
      <label className="search-control">
        <span className="sr-only">Search</span>
        <Search size={18} aria-hidden="true" />
        <Input
          type="search"
          value={query}
          placeholder="Search…"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      {!collapsible && children}
      <div className="search-filters__actions">
        {actions}
        {onClearFilters && hasActiveFilters && (
          <Button type="button" variant="ghost" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
        {collapsible && children && (
          <Button
            type="button"
            variant="secondary"
            aria-expanded={filtersOpen}
            aria-controls={filterFieldsId}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter aria-hidden="true" />
            Filters
            {hasActiveFilters && (
              <span
                className="search-filters__count"
                aria-label={`${activeFilterCount} active`}
              >
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </div>
      {collapsible && filtersOpen && (
        <div className="search-filters__fields" id={filterFieldsId}>
          {children}
        </div>
      )}
    </div>
  );
};

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <header className="page-header">
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="page-header__actions">{actions}</div>}
  </header>
);

export const Spinner = ({
  label = "Loading",
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
}) => (
  <span className={cx("spinner-wrap", `spinner-wrap--${size}`)} role="status">
    <span className="spinner" aria-hidden="true" />
    <span className="sr-only">{label}</span>
  </span>
);

export const LoadingState = ({
  label = "Loading data…",
}: {
  label?: string;
}) => (
  <div className="state-panel" role="status">
    <Spinner size="lg" />
    <p>{label}</p>
  </div>
);

export const EmptyState = ({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="state-panel">
    <Inbox aria-hidden="true" />
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {action}
  </div>
);

export const ErrorState = ({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) => (
  <div className="state-panel" role="alert">
    <AlertTriangle aria-hidden="true" />
    <h2>{title}</h2>
    {message && <p>{message}</p>}
    {onRetry && <Button onClick={onRetry}>Try again</Button>}
  </div>
);

export const Modal = ({
  open,
  title,
  children,
  footer,
  className,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  onClose: () => void;
}) => {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className={cx("modal", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
};

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  warning,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  warning?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <Modal
    open={open}
    title={title}
    onClose={onClose}
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </>
    }
  >
    {warning ? (
      <div className="confirm-warning" role="alert">
        <AlertTriangle aria-hidden="true" />
        <p>{message}</p>
      </div>
    ) : (
      <p>{message}</p>
    )}
  </Modal>
);
