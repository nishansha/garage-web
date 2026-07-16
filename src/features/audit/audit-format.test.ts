import { describe, expect, it } from "vitest";
import {
  formatAuditValue,
  getDeletedRecordLabel,
  humanizeAuditKey,
  isVisibleAuditField,
  visibleSnapshotEntries,
} from "./audit-format";

describe("audit formatting", () => {
  it("maps DB-style fields and hides audit noise", () => {
    expect(humanizeAuditKey("netSaleAmount")).toBe("Net Sale Amount");
    expect(humanizeAuditKey("expenseAccountId")).toBe("Expense Account ID");
    expect(isVisibleAuditField("version")).toBe(false);
    expect(isVisibleAuditField("modifiedAt")).toBe(false);
    expect(
      visibleSnapshotEntries({
        id: 3,
        amount: 25,
        version: 2,
        createdAt: "2026-07-15T10:00:00",
      }).map(([key]) => key),
    ).toEqual(["id", "amount"]);
  });

  it("formats money, dates, enums, IDs, and empty values", () => {
    expect(formatAuditValue("amount", 1250)).toContain("1,250");
    expect(formatAuditValue("paymentDate", "2026-07-15")).toBe("15 Jul 2026");
    expect(formatAuditValue("paymentMethod", "BANK_TRANSFER")).toBe(
      "Bank Transfer",
    );
    expect(formatAuditValue("paymentAccountId", 8)).toBe("#8");
    expect(formatAuditValue("notes", null)).toBe("—");
  });

  it("derives useful deleted-record labels", () => {
    expect(getDeletedRecordLabel("sale", 53, { invoiceNo: "INV-53" })).toBe(
      "INV-53",
    );
    expect(getDeletedRecordLabel("expense", 9, { amount: 15 })).toContain(
      "Expense",
    );
    expect(getDeletedRecordLabel("purchase", 7, {})).toBe("Purchase #7");
  });
});
