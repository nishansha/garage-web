import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError, type ApiFieldError } from "./api";
import {
  validationMessageConfig,
  type ValidationCode,
  type ValidationModule,
} from "./validation-messages";

export const FIELD_VALIDATION_RESPONSE_CODE = "FLD_102";
export const PAYMENT_ACCOUNT_COMPANY_MISMATCH_CODE = "BUS_234";
export const PAYMENT_ACCOUNT_COMPANY_MISMATCH_MESSAGE =
  "This payment account doesn't belong to the selected company";

export const paymentAccountCompanyMismatchMessage = (
  error: unknown,
): string | null =>
  error instanceof ApiError &&
  error.code === PAYMENT_ACCOUNT_COMPANY_MISMATCH_CODE
    ? PAYMENT_ACCOUNT_COMPANY_MISMATCH_MESSAGE
    : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isApiFieldError = (value: unknown): value is ApiFieldError =>
  isRecord(value) &&
  typeof value.field === "string" &&
  typeof value.code === "string";

export const normalizeFieldPath = (field: string): string =>
  field.replace(/\[(\d+)\]/g, ".$1").replace(/^\./, "");

export const normalizeConfigFieldPath = (field: string): string =>
  normalizeFieldPath(field)
    .split(".")
    .filter((part) => !/^\d+$/.test(part))
    .join(".");

const resolveFieldValidationMessage = (
  moduleName: ValidationModule,
  field: string,
  code: string,
  serverMessage?: string,
): string => {
  const configField = normalizeConfigFieldPath(field);
  const serverText = serverMessage?.trim();
  return (
    validationMessageConfig[`${moduleName}.${configField}.${code}`] ??
    validationMessageConfig[`common.field.${code}`] ??
    (serverText || validationMessageConfig["common.field.INVALID_VALUE"])
  );
};

export const getFieldValidationMessage = (
  moduleName: ValidationModule,
  field: string,
  code: ValidationCode,
): string => resolveFieldValidationMessage(moduleName, field, code);

export const getServerFieldValidationMessage = (
  moduleName: ValidationModule,
  field: string,
  code: string,
  serverMessage?: string,
): string =>
  resolveFieldValidationMessage(moduleName, field, code, serverMessage);

export const extractFieldErrors = (error: unknown): ApiFieldError[] => {
  if (!(error instanceof ApiError) || !isRecord(error.data)) return [];
  const errors = error.data.errors;
  return Array.isArray(errors) ? errors.filter(isApiFieldError) : [];
};

export const getFieldValidationErrorMap = (
  error: unknown,
  moduleName: ValidationModule,
  fieldMap?: Record<string, string>,
): Record<string, string> | null => {
  const errors = extractFieldErrors(error);
  if (!errors.length) return null;
  return Object.fromEntries(
    errors.map(({ field, code, message }) => [
      fieldMap?.[field] ??
        fieldMap?.[normalizeFieldPath(field)] ??
        normalizeFieldPath(field),
      resolveFieldValidationMessage(moduleName, field, code, message),
    ]),
  );
};

export const applyFieldValidationErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  moduleName: ValidationModule,
  fieldMap?: Record<string, Path<T>>,
): boolean => {
  const errors = extractFieldErrors(error);
  if (!errors.length) return false;
  errors.forEach(({ field, code, message }) => {
    const normalizedField = normalizeFieldPath(field);
    setError(
      (fieldMap?.[field] ??
        fieldMap?.[normalizedField] ??
        normalizedField) as Path<T>,
      {
        type: "server",
        message: resolveFieldValidationMessage(
          moduleName,
          field,
          code,
          message,
        ),
      },
    );
  });
  return true;
};

export const tryApplyManualFieldValidationErrors = (
  error: unknown,
  setErrors: (errors: Record<string, string>) => void,
  moduleName: ValidationModule,
  fieldMap?: Record<string, string>,
): boolean => {
  const errors = getFieldValidationErrorMap(error, moduleName, fieldMap);
  if (!errors) return false;
  setErrors(errors);
  return true;
};
