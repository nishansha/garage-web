export type ColorTheme = "dark" | "light";
export type ThemePreference = "DARK" | "LIGHT";

export const THEME_STORAGE_KEY = "garage.web.theme";
export const DEFAULT_THEME: ColorTheme = "dark";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "DARK";

export const THEME_OPTIONS: readonly {
  value: ColorTheme;
  label: string;
  description: string;
}[] = [
  {
    value: "dark",
    label: "Dark",
    description: "Cool navy surfaces with mint, coral and sky accents.",
  },
  {
    value: "light",
    label: "Light",
    description: "Soft gray-blue canvas with the same accent colors.",
  },
];

export const isColorTheme = (value: unknown): value is ColorTheme =>
  value === "dark" || value === "light";

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "DARK" || value === "LIGHT";

export const toColorTheme = (value: unknown): ColorTheme => {
  if (value === "LIGHT" || value === "light") return "light";
  if (value === "DARK" || value === "dark") return "dark";
  return DEFAULT_THEME;
};

export const toThemePreference = (theme: ColorTheme): ThemePreference =>
  theme === "light" ? "LIGHT" : "DARK";

export const readStoredTheme = (): ColorTheme => {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isColorTheme(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const applyTheme = (theme: ColorTheme): void => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};

export const persistTheme = (theme: ColorTheme): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage should still apply the theme for this session.
  }
  applyTheme(theme);
};
