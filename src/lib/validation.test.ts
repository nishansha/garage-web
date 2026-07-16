import { describe, expect, it, vi } from "vitest";
import type { UseFormSetError } from "react-hook-form";
import { ApiError, type ApiFieldError } from "./api";
import {
  FIELD_VALIDATION_RESPONSE_CODE,
  applyFieldValidationErrors,
  extractFieldErrors,
  getFieldValidationErrorMap,
  getFieldValidationMessage,
  getServerFieldValidationMessage,
  normalizeConfigFieldPath,
  normalizeFieldPath,
  tryApplyManualFieldValidationErrors,
} from "./validation";

const fieldError = (
  errors: unknown,
  code: string | undefined = FIELD_VALIDATION_RESPONSE_CODE,
) => new ApiError("Validation failed", 422, code, { errors });

describe("field validation extraction", () => {
  it("extracts valid field errors from an FLD_102 ApiError", () => {
    const errors: ApiFieldError[] = [
      { field: "description", code: "REQUIRED" },
      {
        field: "items.0.quantity",
        code: "MUST_BE_POSITIVE",
        message: "Quantity must exceed zero",
      },
    ];

    expect(extractFieldErrors(fieldError(errors))).toEqual(errors);
  });

  it("also extracts structured errors from a raw ApiError without a response code", () => {
    const errors = [{ field: "code", code: "INVALID_FORMAT" }];

    expect(extractFieldErrors(fieldError(errors, undefined))).toEqual(errors);
  });

  it("filters malformed entries and rejects non-ApiError shapes", () => {
    const valid = { field: "name", code: "REQUIRED" };
    expect(
      extractFieldErrors(
        fieldError([
          valid,
          null,
          { field: "missing-code" },
          { field: 12, code: "REQUIRED" },
        ]),
      ),
    ).toEqual([valid]);

    expect(
      extractFieldErrors({
        code: FIELD_VALIDATION_RESPONSE_CODE,
        data: { errors: [valid] },
      }),
    ).toEqual([]);
    expect(extractFieldErrors(new Error("Network failure"))).toEqual([]);
    expect(extractFieldErrors(fieldError({ field: valid }))).toEqual([]);
  });
});

describe("field validation messages and maps", () => {
  it("uses the same module field config for UI and server messages", () => {
    expect(
      getFieldValidationMessage("purchase", "purchaseRate", "REQUIRED"),
    ).toBe("Purchase rate is required");
    expect(
      getServerFieldValidationMessage(
        "purchase",
        "purchaseRate",
        "REQUIRED",
        "  Use the server wording  ",
      ),
    ).toBe("Purchase rate is required");
  });

  it("falls back to common code messages and then server wording", () => {
    expect(
      getFieldValidationMessage("purchase", "unknown", "INVALID_FORMAT"),
    ).toBe("Invalid format");
    expect(
      getServerFieldValidationMessage(
        "purchase",
        "unknown",
        "NOT_DOCUMENTED",
        "Server validation failed",
      ),
    ).toBe("Server validation failed");
  });

  it("normalizes bracket paths for forms and indexed paths for config", () => {
    expect(normalizeFieldPath("expenses[1].amount")).toBe("expenses.1.amount");
    expect(normalizeConfigFieldPath("expenses[1].amount")).toBe(
      "expenses.amount",
    );
    expect(
      getFieldValidationMessage("purchase", "expenses[1].amount", "REQUIRED"),
    ).toBe("Expense amount is required");
  });

  it("uses exact field mappings and converts nested bracket paths", () => {
    const error = fieldError([
      { field: "category_id", code: "REQUIRED" },
      { field: "expenses[1].amount", code: "REQUIRED" },
      { field: "category", code: "INVALID_FORMAT" },
    ]);

    expect(
      getFieldValidationErrorMap(error, "purchase", {
        category_id: "categoryId",
      }),
    ).toEqual({
      categoryId: "This field is required",
      "expenses.1.amount": "Expense amount is required",
      category: "Invalid format",
    });
  });

  it("returns null for errors without field validation details", () => {
    expect(
      getFieldValidationErrorMap(new Error("Unauthorized"), "purchase"),
    ).toBeNull();
    expect(getFieldValidationErrorMap(fieldError([]), "purchase")).toBeNull();
  });
});

describe("field validation application", () => {
  it("maps the purchase FLD_102 response to configured messages and RHF paths", () => {
    type Values = {
      purchaseRate: number;
      vehicleNo: string;
      expenses: Array<{ amount: number }>;
    };
    const setError = vi.fn<UseFormSetError<Values>>();
    const error = fieldError([
      { field: "purchaseRate", code: "REQUIRED" },
      { field: "vehicleNo", code: "REQUIRED" },
      { field: "expenses[1].amount", code: "REQUIRED" },
      { field: "expenses[0].amount", code: "REQUIRED" },
    ]);

    expect(
      applyFieldValidationErrors<Values>(error, setError, "purchase"),
    ).toBe(true);
    expect(setError).toHaveBeenNthCalledWith(1, "purchaseRate", {
      type: "server",
      message: "Purchase rate is required",
    });
    expect(setError).toHaveBeenNthCalledWith(2, "vehicleNo", {
      type: "server",
      message: "Vehicle number is required",
    });
    expect(setError).toHaveBeenNthCalledWith(3, "expenses.1.amount", {
      type: "server",
      message: "Expense amount is required",
    });
    expect(setError).toHaveBeenNthCalledWith(4, "expenses.0.amount", {
      type: "server",
      message: "Expense amount is required",
    });
  });

  it("applies mapped and nested errors through the RHF setError contract", () => {
    type Values = {
      categoryId: number;
      items: Array<{ quantity: number }>;
    };
    const setError = vi.fn<UseFormSetError<Values>>();
    const error = fieldError([
      { field: "category_id", code: "REQUIRED" },
      {
        field: "items.0.quantity",
        code: "MUST_BE_POSITIVE",
        message: "Enter at least one",
      },
    ]);

    expect(
      applyFieldValidationErrors<Values>(error, setError, "purchase", {
        category_id: "categoryId",
      }),
    ).toBe(true);
    expect(setError).toHaveBeenNthCalledWith(1, "categoryId", {
      type: "server",
      message: "This field is required",
    });
    expect(setError).toHaveBeenNthCalledWith(2, "items.0.quantity", {
      type: "server",
      message: "Must be a positive number",
    });
  });

  it("does not call RHF setError for a non-field error", () => {
    const setError = vi.fn<UseFormSetError<{ name: string }>>();

    expect(
      applyFieldValidationErrors<{ name: string }>(
        new Error("Offline"),
        setError,
        "staff",
      ),
    ).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it("applies the same mapping to manual form errors", () => {
    const setErrors = vi.fn();

    expect(
      tryApplyManualFieldValidationErrors(
        fieldError([{ field: "part_number", code: "INVALID_CHARS" }]),
        setErrors,
        "masterData",
        { part_number: "partNumber" },
      ),
    ).toBe(true);
    expect(setErrors).toHaveBeenCalledWith({
      partNumber: "Contains invalid characters",
    });
  });
});
