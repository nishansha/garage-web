import { describe, expect, it } from "vitest";
import { toPdfFilename } from "./downloadPdf";

describe("toPdfFilename", () => {
  it("keeps a clean document code", () => {
    expect(toPdfFilename("PO-12-KA01AB1234")).toBe("PO-12-KA01AB1234.pdf");
  });

  it("strips hashes, spaces, and illegal characters", () => {
    expect(toPdfFilename("#SO-9 KA 01 AB/1234")).toBe("SO-9-KA-01-AB-1234.pdf");
  });

  it("does not duplicate the pdf extension", () => {
    expect(toPdfFilename("PR-4.pdf")).toBe("PR-4.pdf");
  });
});
