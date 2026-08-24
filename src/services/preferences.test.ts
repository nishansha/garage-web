import { describe, expect, it } from "vitest";
import { normalizePreferences } from "./preferences";

describe("normalizePreferences", () => {
  it("reads DARK and LIGHT from the API payload", () => {
    expect(normalizePreferences({ theme: "LIGHT" }).theme).toBe("LIGHT");
    expect(normalizePreferences({ theme: "DARK" }).theme).toBe("DARK");
  });

  it("defaults missing or unknown theme values to DARK", () => {
    expect(normalizePreferences({}).theme).toBe("DARK");
    expect(normalizePreferences({ theme: "system" as never }).theme).toBe(
      "DARK",
    );
  });

  it("keeps the navbar position when present", () => {
    expect(
      normalizePreferences({ navbarPosition: "TOP", theme: "LIGHT" }),
    ).toEqual({
      navbarPosition: "TOP",
      theme: "LIGHT",
    });
  });
});
