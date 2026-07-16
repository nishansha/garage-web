import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { ApiError } from "../lib/api";
import {
  FIELD_VALIDATION_RESPONSE_CODE,
  applyFieldValidationErrors,
} from "../lib/validation";
import { FormField, Input } from "./ui";

afterEach(cleanup);

describe("FormField", () => {
  it("renders an inline error beneath its control with accessible attributes", () => {
    render(
      <FormField label="Part number" error="Part number is required">
        <Input aria-describedby="part-number-help" />
      </FormField>,
    );

    const input = screen.getByRole("textbox");
    const error = screen.getByRole("alert");

    expect(error).toHaveTextContent("Part number is required");
    expect(error.previousElementSibling).toContainElement(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute(
      "aria-describedby",
      `part-number-help ${error.id}`,
    );
  });

  it("leaves the control valid and displays its hint when there is no error", () => {
    render(
      <FormField label="Notes" hint="Optional details">
        <Input />
      </FormField>,
    );

    const input = screen.getByRole("textbox");
    expect(screen.getByText("Optional details")).toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});

describe("representative server-validated form", () => {
  it("shows an RHF server error inline on the mapped field", () => {
    const ValidationHarness = () => {
      const form = useForm<{ partNumber: string }>({
        defaultValues: { partNumber: "" },
      });

      const applyServerResponse = () => {
        applyFieldValidationErrors(
          new ApiError(
            "Validation failed",
            422,
            FIELD_VALIDATION_RESPONSE_CODE,
            {
              errors: [
                {
                  field: "part_number",
                  code: "INVALID_FORMAT",
                  message: "Use letters and numbers only",
                },
              ],
            },
          ),
          form.setError,
          "masterData",
          { part_number: "partNumber" },
        );
      };

      return (
        <form>
          <FormField
            label="Part number"
            error={form.formState.errors.partNumber?.message}
          >
            <Input {...form.register("partNumber")} />
          </FormField>
          <button type="button" onClick={applyServerResponse}>
            Apply server response
          </button>
        </form>
      );
    };

    render(<ValidationHarness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Apply server response" }),
    );

    const input = screen.getByRole("textbox");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Invalid format");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Invalid format");
  });
});
