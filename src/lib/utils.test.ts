import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, toCsv } from "./utils";
import { friendlyHttpMessage, sanitizeErrorMessage, unwrap } from "./api";

describe("formatters", () => {
  it("formats valid values and safely handles invalid values", () => {
    expect(formatCurrency(1250)).toContain("₹");
    expect(formatCurrency(1250)).toContain("1,250");
    expect(formatCurrency("invalid")).toBe("—");
    expect(formatDate("2026-07-15")).toBe("15 Jul 2026");
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("escapes CSV cells", () => {
    expect(toCsv([{ name: "Parts, Ltd.", note: 'Said "hello"' }])).toBe(
      'name,note\r\n"Parts, Ltd.","Said ""hello"""',
    );
  });
});

describe("API helpers", () => {
  it("unwraps success envelopes", () => {
    expect(unwrap<{ id: number }>({ success: true, data: { id: 7 } })).toEqual({
      id: 7,
    });
  });

  it("does not expose HTML error documents", () => {
    expect(sanitizeErrorMessage("<html>gateway failure</html>", 502)).toBe(
      friendlyHttpMessage(502),
    );
  });

  it("throws safe API envelope errors", () => {
    expect(() =>
      unwrap(
        { success: false, code: "INVALID", message: "Invalid request" },
        400,
      ),
    ).toThrow("Invalid request");
  });
});
