/* oxlint-disable react/only-export-components -- route helpers intentionally colocated */
import { useEffect, useMemo, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { FORBIDDEN_MESSAGE, isForbiddenError } from "../../lib/rbac";
import { z } from "zod";
import {
  Button,
  Card,
  DateInput,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Textarea,
} from "../../components/ui";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  applyFieldValidationErrors,
  getFieldValidationMessage,
} from "../../lib/validation";
import {
  operationsApi,
  type Payment,
  type PaymentInput,
  type PayerType,
} from "../../services/operations";

export type OutstandingQueryKind =
  | "purchase-payables"
  | "purchase-return-receivables"
  | "sales-receivables"
  | "sales-rc-due"
  | "sale-return-payables";

export const invalidateOutstanding = (
  client: QueryClient,
  kind: OutstandingQueryKind,
) =>
  client.invalidateQueries({ queryKey: ["operations", "outstanding", kind] });

export const today = () => new Date().toISOString().slice(0, 10);
export const numberValue = (value: FormDataEntryValue | null) =>
  Number(typeof value === "string" ? value : 0);
export const optionalText = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
};
export const errorMessage = (error: unknown) =>
  error instanceof ApiError || error instanceof Error
    ? error.message
    : "The operation could not be completed.";
const fieldErrorHandlers = new Set<(error: unknown) => boolean>();
export const notifyError = (error: unknown) => {
  for (const handler of [...fieldErrorHandlers].reverse()) {
    if (handler(error)) return;
  }
  toast.error(
    isForbiddenError(error) ? FORBIDDEN_MESSAGE : errorMessage(error),
  );
};
export const useNumericParam = (name: string) => {
  const value = useParams()[name];
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const DetailGrid = ({ children }: { children: ReactNode }) => (
  <dl className="operations-detail-grid">{children}</dl>
);
export const Detail = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div>
    <dt>{label}</dt>
    <dd>{value ?? "—"}</dd>
  </div>
);
export const Money = ({ value }: { value?: number | string | null }) => (
  <>{formatCurrency(value)}</>
);
export const DateValue = ({ value }: { value?: string | null }) => (
  <>{formatDate(value)}</>
);
export const InvalidRoute = () => (
  <ErrorState
    title="Invalid route"
    message="The requested record identifier is invalid."
  />
);
export const QueryBoundary = ({
  pending,
  error,
  retry,
  children,
}: {
  pending: boolean;
  error: unknown;
  retry?: () => void;
  children: ReactNode;
}) => {
  if (pending) return <LoadingState />;
  if (error)
    return <ErrorState message={errorMessage(error)} onRetry={retry} />;
  return <>{children}</>;
};
export const FormActions = ({
  cancelTo,
  pending,
  label = "Save",
}: {
  cancelTo: string;
  pending: boolean;
  label?: string;
}) => (
  <div className="operations-form-actions">
    <Link className="button button--secondary" to={cancelTo}>
      Cancel
    </Link>
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  </div>
);
export const Section = ({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) => (
  <Card className="operations-section">
    {(title || actions) && (
      <header>
        {title && <h2>{title}</h2>}
        {actions}
      </header>
    )}
    {children}
  </Card>
);
export const RouteFormPage = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <>
    <PageHeader title={title} description={description} />
    {children}
  </>
);

const paymentSchema = (maximum?: number, maximumMessage?: string) =>
  z
    .object({
      amount: z
        .number({
          error: getFieldValidationMessage("payment", "amount", "REQUIRED"),
        })
        .positive(
          getFieldValidationMessage("payment", "amount", "MUST_BE_POSITIVE"),
        ),
      paymentDate: z
        .string()
        .min(
          1,
          getFieldValidationMessage("payment", "paymentDate", "REQUIRED"),
        ),
      paymentMethod: z.enum(["CASH", "BANK", "CHEQUE"], {
        error: getFieldValidationMessage(
          "payment",
          "paymentMethod",
          "REQUIRED",
        ),
      }),
      paymentAccountId: z
        .number({
          error: getFieldValidationMessage(
            "payment",
            "paymentAccountId",
            "REQUIRED",
          ),
        })
        .int()
        .positive(
          getFieldValidationMessage("payment", "paymentAccountId", "REQUIRED"),
        ),
      referenceNo: z.string(),
      notes: z.string(),
    })
    .refine((value) => maximum === undefined || value.amount <= maximum, {
      path: ["amount"],
      message:
        maximumMessage ??
        getFieldValidationMessage("payment", "amount", "MAXIMUM"),
    });

type PaymentFormValues = z.infer<ReturnType<typeof paymentSchema>>;

export const PaymentForm = ({
  payment,
  maximum,
  defaultAmount,
  enforceAccountBalance = false,
  maximumMessage,
  payer,
  pending,
  cancelTo,
  submitLabel,
  onSubmit,
}: {
  payment?: Payment;
  maximum?: number;
  defaultAmount?: number;
  enforceAccountBalance?: boolean;
  maximumMessage?: string;
  payer?: PayerType;
  pending: boolean;
  cancelTo: string;
  submitLabel: string;
  onSubmit: (value: PaymentInput) => void;
}) => {
  const accounts = useQuery({
    queryKey: ["operations", "payment-accounts"],
    queryFn: operationsApi.paymentAccounts,
  });
  const {
    clearErrors,
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema(maximum, maximumMessage)),
    defaultValues: {
      amount: payment?.amount ?? defaultAmount,
      paymentDate: payment?.paymentDate ?? today(),
      paymentMethod: payment?.paymentMethod ?? "CASH",
      paymentAccountId: payment?.paymentAccountId,
      referenceNo: payment?.referenceNo ?? "",
      notes: payment?.notes ?? "",
    },
  });
  const paymentMethod = watch("paymentMethod");
  const paymentAccountId = watch("paymentAccountId");
  const filteredAccounts = useMemo(
    () =>
      (accounts.data ?? []).filter(
        (account) => account.active && account.accountType === paymentMethod,
      ),
    [accounts.data, paymentMethod],
  );
  const selectedAccount = filteredAccounts.find(
    (account) => account.id === paymentAccountId,
  );
  const accountBalance =
    selectedAccount?.currentBalance ?? selectedAccount?.openingBalance ?? null;
  const availableBalance =
    accountBalance === null
      ? null
      : accountBalance +
        (payment && payment.paymentAccountId === selectedAccount?.id
          ? payment.amount
          : 0);

  useEffect(() => {
    if (!accounts.data) return;
    if (filteredAccounts.length === 1) {
      const accountId = filteredAccounts[0].id;
      if (paymentAccountId !== accountId) {
        setValue("paymentAccountId", accountId, { shouldValidate: true });
      }
      return;
    }
    if (
      paymentAccountId &&
      !filteredAccounts.some((account) => account.id === paymentAccountId)
    ) {
      setValue("paymentAccountId", 0, { shouldValidate: true });
      clearErrors("amount");
    }
  }, [
    accounts.data,
    clearErrors,
    filteredAccounts,
    paymentAccountId,
    setValue,
  ]);
  useEffect(() => {
    const handleFieldErrors = (error: unknown) =>
      applyFieldValidationErrors(error, setError, "payment", {
        amount: "amount",
        paymentDate: "paymentDate",
        date: "paymentDate",
        paymentMethod: "paymentMethod",
        paymentAccountId: "paymentAccountId",
        accountId: "paymentAccountId",
        referenceNo: "referenceNo",
        notes: "notes",
      });
    fieldErrorHandlers.add(handleFieldErrors);
    return () => {
      fieldErrorHandlers.delete(handleFieldErrors);
    };
  }, [setError]);
  const submit = (value: PaymentFormValues) => {
    if (
      enforceAccountBalance &&
      availableBalance !== null &&
      value.amount > availableBalance
    ) {
      setError("amount", {
        type: "validate",
        message: getFieldValidationMessage("payment", "amount", "MAXIMUM"),
      });
      return;
    }
    onSubmit({
      amount: value.amount,
      paymentDate: value.paymentDate,
      paymentMethod: value.paymentMethod,
      paymentAccountId: value.paymentAccountId,
      payerType: payer,
      referenceNo: value.referenceNo.trim() || undefined,
      notes: value.notes.trim() || undefined,
      version: payment?.version,
    });
  };
  return (
    <form
      className="operations-form"
      noValidate
      onSubmit={handleSubmit(submit)}
    >
      <Section title="Payment details">
        <div className="operations-form-grid">
          <FormField label="Amount" required error={errors.amount?.message}>
            <Input
              type="number"
              min="0.01"
              max={maximum}
              step="0.01"
              required
              {...register("amount", { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Date" required error={errors.paymentDate?.message}>
            <DateInput required {...register("paymentDate")} />
          </FormField>
          <FormField
            label="Method"
            required
            error={errors.paymentMethod?.message}
          >
            <Select
              {...register("paymentMethod", {
                onChange: () => {
                  clearErrors(["paymentAccountId", "amount"]);
                },
              })}
              options={[
                { value: "CASH", label: "Cash" },
                { value: "BANK", label: "Bank" },
                { value: "CHEQUE", label: "Cheque" },
              ]}
            />
          </FormField>
          <FormField
            label="Payment account"
            required
            error={errors.paymentAccountId?.message}
            hint={
              selectedAccount
                ? `Available balance: ${formatCurrency(accountBalance)}`
                : undefined
            }
          >
            <Select
              required
              disabled={filteredAccounts.length === 1}
              {...register("paymentAccountId", {
                valueAsNumber: true,
                onChange: () => clearErrors(["paymentAccountId", "amount"]),
              })}
            >
              <option value="">Select account</option>
              {filteredAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountType === "BANK" && account.bankName
                    ? `${account.name} (${account.bankName})`
                    : account.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Reference number"
            error={errors.referenceNo?.message}
          >
            <Input {...register("referenceNo")} />
          </FormField>
          <FormField label="Notes" error={errors.notes?.message}>
            <Textarea {...register("notes")} />
          </FormField>
        </div>
      </Section>
      <FormActions cancelTo={cancelTo} pending={pending} label={submitLabel} />
    </form>
  );
};

export const useGoBack = (fallback: string) => {
  const navigate = useNavigate();
  return () => {
    if (history.length > 1) navigate(-1);
    else navigate(fallback);
  };
};

export interface OperationsRouteMetadata {
  path: string;
  component: React.ComponentType;
  title: string;
  entity?: "purchase" | "sale" | "inventory" | "expense" | "return";
  mode?: "list" | "detail" | "create" | "edit" | "payment";
}
