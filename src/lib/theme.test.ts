import { afterEach, describe, expect, it } from "vitest";
import {
  applyTheme,
  DEFAULT_THEME,
  isColorTheme,
  persistTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  toColorTheme,
  toThemePreference,
} from "./theme";

const reset = () => {
  localStorage.removeItem(THEME_STORAGE_KEY);
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
};

afterEach(reset);

describe("theme", () => {
  it("accepts only dark and light values", () => {
    expect(isColorTheme("dark")).toBe(true);
    expect(isColorTheme("light")).toBe(true);
    expect(isColorTheme("system")).toBe(false);
    expect(isColorTheme(null)).toBe(false);
  });

  it("defaults to dark when nothing is stored", () => {
    expect(readStoredTheme()).toBe(DEFAULT_THEME);
  });

  it("applies and persists the selected theme", () => {
    persistTheme("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(readStoredTheme()).toBe("light");
  });

  it("writes the theme onto the document", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("maps API DARK/LIGHT values onto the document theme", () => {
    expect(toColorTheme("LIGHT")).toBe("light");
    expect(toColorTheme("DARK")).toBe("dark");
    expect(toThemePreference("light")).toBe("LIGHT");
    expect(toThemePreference("dark")).toBe("DARK");
  });
});
