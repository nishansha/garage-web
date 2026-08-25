import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_MISSING_CODE,
  ATTACHMENT_MISSING_MESSAGE,
  ATTACHMENT_REJECTED_MESSAGE,
  ApiError,
  friendlyHttpMessage,
  unwrap,
} from "../lib/api";
import {
  EXPENSE_RECEIPT,
  INVENTORY_PHOTO,
  VENDOR_ID_PROOF,
  acceptForCategory,
  attachmentErrorMessage,
  isOversizedAttachment,
  matchesAccept,
  oversizedAttachmentMessage,
} from "./upload";

describe("attachment helpers", () => {
  it("flags files over Spring's 1 MB default", () => {
    expect(isOversizedAttachment({ size: 1024 * 1024 })).toBe(false);
    expect(isOversizedAttachment({ size: 1024 * 1024 + 1 })).toBe(true);
  });

  it("names oversized files in the client message", () => {
    expect(oversizedAttachmentMessage(["car-front.jpg"])).toBe(
      '"car-front.jpg" is larger than 1 MB. Each file must be under 1 MB.',
    );
    expect(oversizedAttachmentMessage(["a.jpg", "b.jpg"])).toBe(
      "2 files are larger than 1 MB. Each file must be under 1 MB.",
    );
  });

  it("maps missing-attachment errors by code, not status", () => {
    expect(friendlyHttpMessage(400, ATTACHMENT_MISSING_CODE)).toBe(
      ATTACHMENT_MISSING_MESSAGE,
    );
    expect(
      attachmentErrorMessage(
        new ApiError("ignored", 400, ATTACHMENT_MISSING_CODE),
      ),
    ).toBe(ATTACHMENT_MISSING_MESSAGE);
    expect(() =>
      unwrap(
        { success: false, code: ATTACHMENT_MISSING_CODE, message: "gone" },
        400,
      ),
    ).toThrow(ATTACHMENT_MISSING_MESSAGE);
  });

  it("maps rejected uploads to a file-size message", () => {
    expect(friendlyHttpMessage(413)).toBe(ATTACHMENT_REJECTED_MESSAGE);
    expect(attachmentErrorMessage(new ApiError("Payload too large", 413))).toBe(
      ATTACHMENT_REJECTED_MESSAGE,
    );
    expect(
      attachmentErrorMessage(new ApiError("Maximum upload size exceeded", 500)),
    ).toBe(ATTACHMENT_REJECTED_MESSAGE);
  });

  it("matches accept filters for images and extensions", () => {
    const jpeg = new File(["x"], "car.jpg", { type: "image/jpeg" });
    const pdf = new File(["x"], "id.pdf", { type: "application/pdf" });
    expect(matchesAccept(jpeg, "image/*")).toBe(true);
    expect(matchesAccept(pdf, "image/*")).toBe(false);
    expect(matchesAccept(pdf, "image/*,.pdf,application/pdf")).toBe(true);
    expect(acceptForCategory(INVENTORY_PHOTO.category)).toBe("image/*");
    expect(acceptForCategory(VENDOR_ID_PROOF.category)).toBe(
      "image/*,.pdf,application/pdf",
    );
    expect(acceptForCategory(EXPENSE_RECEIPT.category)).toBe(
      "image/*,.pdf,application/pdf",
    );
  });
});
